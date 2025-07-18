import {
  LLMContext,
  LLMFunction,
  LLMModelQuality,
  LLMPurpose,
  LLMResponseStatus,
  LLMGeneratedContent,
  LLMFunctionResponse,
  ResolvedLLMModelMetadata,
  LLMCompletionOptions,
} from "../llm.types";
import type { LLMProviderImpl, LLMCandidateFunction } from "../llm.types";
import { BadConfigurationLLMError } from "../errors/llm-errors.types";
import { withRetry } from "../../common/control/control-utils";
import { RetryFunc } from "../../common/control/control.types";
import type { PromptAdapter } from "../processing/prompting/prompt-adapter";
import {
  log,
  logErrWithContext,
  logWithContext,
} from "../processing/routerTracking/llm-router-logging";
import type LLMStats from "../processing/routerTracking/llm-stats";
import type { LLMRetryConfig } from "../providers/llm-provider.types";
import { LLMService } from "./llm-service";
import type { EnvVars } from "../../lifecycle/env.types";

import {
  getOverridenCompletionCandidates,
  buildCompletionCandidates,
  getRetryConfiguration,
} from "../processing/msgProcessing/request-configurer";
import { FailedAttemptError } from "p-retry";
import { validateSchemaIfNeededAndReturnResponse } from "../processing/msgProcessing/content-tools";

// Custom error class with status field
export class RetryStatusError extends Error {
  constructor(
    message: string,
    readonly status: LLMResponseStatus.OVERLOADED | LLMResponseStatus.INVALID,
  ) {
    super(message);
    this.name = "RetryStatusError";
  }
}

/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization /
 * completion function:
 *
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
export default class LLMRouter {
  // Private fields
  private readonly llm: LLMProviderImpl;
  private readonly modelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  private readonly completionCandidates: LLMCandidateFunction[];
  private readonly providerRetryConfig: LLMRetryConfig;

  /**
   * Constructor.
   *
   * @param llmService The LLM service for provider management
   * @param envVars Environment variables
   * @param llmStats The LLM statistics tracker
   * @param promptAdapter The prompt adapter for handling token limits
   */
  constructor(
    private readonly llmService: LLMService,
    private readonly envVars: EnvVars,
    private readonly llmStats: LLMStats,
    private readonly promptAdapter: PromptAdapter,
  ) {
    this.llm = this.llmService.getLLMProvider(this.envVars);
    this.modelsMetadata = this.llm.getModelsMetadata();
    const llmManifest = this.llmService.getLLMManifest();
    this.providerRetryConfig = llmManifest.providerSpecificConfig ?? {};
    this.completionCandidates = buildCompletionCandidates(this.llm);

    if (this.completionCandidates.length === 0) {
      throw new BadConfigurationLLMError(
        "At least one completion candidate function must be provided",
      );
    }

    log(`Router LLMs to be used: ${this.getModelsUsedDescription()}`);
  }

  /**
   * Call close on LLM implementation to release resources.
   */
  async close(): Promise<void> {
    await this.llm.close();
  }

  /**
   * Get the model family of the LLM implementation.
   */
  getModelFamily(): string {
    return this.llm.getModelFamily();
  }

  /**
   * Get the description of models the chosen plug-in provides.
   */
  getModelsUsedDescription(): string {
    const [embeddings, primaryCompletion, secondaryCompletion] = this.llm.getModelsNames();
    const candidateDescriptions = this.completionCandidates
      .map((candidate) => {
        const modelId =
          candidate.modelQuality === LLMModelQuality.PRIMARY
            ? primaryCompletion
            : secondaryCompletion;
        return `${candidate.modelQuality}: ${modelId}`;
      })
      .join(", ");
    return `${this.llm.getModelFamily()} (embeddings: ${embeddings}, completions - ${candidateDescriptions})`;
  }

  /**
   * Get the maximum number of tokens for the given model quality.
   */
  getEmbeddedModelDimensions(): number | undefined {
    return this.llm.getEmbeddedModelDimensions();
  }

  /**
   * Send the content to the LLM for it to generate and return the content's embedding.
   */
  async generateEmbeddings(resourceName: string, content: string): Promise<number[] | null> {
    // Construct context internally using available information
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.EMBEDDINGS,
    };

    const contentResponse = await this.invokeLLMWithRetriesAndAdaptation(
      resourceName,
      content,
      context,
      [this.llm.generateEmbeddings.bind(this.llm)],
    );

    if (contentResponse === null) return null;

    if (
      !(Array.isArray(contentResponse) && contentResponse.every((item) => typeof item === "number"))
    ) {
      logErrWithContext("LLM response for embeddings was not an array of numbers", context);
      return null;
    }

    return contentResponse;
  }

  /**
   * Send the prompt to the LLM for and retrieve the LLM's answer.
   *
   * When options.jsonSchema is provided, this method will:
   * - Use native JSON mode capabilities where available
   * - Fall back to text parsing for providers that don't support structured output
   * - Validate the response against the provided Zod schema
   * - Return the validated, typed result
   *
   * If a particular LLM quality is not specified, will try to use the completion candidates
   * in the order they were configured during construction.
   */
  async executeCompletion<T = LLMGeneratedContent>(
    resourceName: string,
    prompt: string,
    options: LLMCompletionOptions,
    modelQualityOverride: LLMModelQuality | null = null,
  ): Promise<T | null> {
    const { candidatesToUse, candidateFunctions } = getOverridenCompletionCandidates(
      this.completionCandidates,
      modelQualityOverride,
    );
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.COMPLETIONS,
      modelQuality: candidatesToUse[0].modelQuality,
      outputFormat: options.outputFormat,
    };
    const llmResponse = await this.invokeLLMWithRetriesAndAdaptation(
      resourceName,
      prompt,
      context,
      candidateFunctions,
      candidatesToUse,
      options,
    );
    return validateSchemaIfNeededAndReturnResponse(llmResponse, options, resourceName);
  }

  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  displayLLMStatusSummary(): void {
    console.log("LLM inovocation event types that will be recorded:");
    console.table(this.llmStats.getStatusTypesStatistics(), ["description", "symbol"]);
  }

  /**
   * Print the accumulated statistics of LLM invocation result types.
   */
  displayLLMStatusDetails(): void {
    console.table(this.llmStats.getStatusTypesStatistics(true));
  }

  /**
   * Crops the prompt to fit within token limits when the current LLM exceeds capacity.
   */
  private cropPromptForTokenLimit(currentPrompt: string, llmResponse: LLMFunctionResponse): string {
    this.llmStats.recordCrop();
    return this.promptAdapter.adaptPromptFromResponse(
      currentPrompt,
      llmResponse,
      this.modelsMetadata,
    );
  }

  /**
   * Executes an LLM function applying a series of before and after non-functional aspects (e.g.
   * retries, switching LLM qualities, truncating large prompts)..
   *
   * Context is just an optional object of key value pairs which will be retained with the LLM
   * request and subsequent response for convenient debugging and error logging context.
   */
  private async invokeLLMWithRetriesAndAdaptation(
    resourceName: string,
    prompt: string,
    context: LLMContext,
    llmFunctions: LLMFunction[],
    candidateModels?: LLMCandidateFunction[],
    completionOptions?: LLMCompletionOptions,
  ) {
    let result: LLMGeneratedContent | null = null;
    const currentPrompt = prompt;

    try {
      result = await this.iterateOverLLMFunctions(
        resourceName,
        currentPrompt,
        context,
        llmFunctions,
        candidateModels,
        completionOptions,
      );

      if (!result) {
        log(
          `Given-up on trying to fulfill the current prompt with an LLM for the following resource: '${resourceName}'`,
        );
        this.llmStats.recordFailure();
      }
    } catch (error: unknown) {
      log(
        `Unable to process the following resource with an LLM due to a non-recoverable error for the following resource: '${resourceName}'`,
      );
      logErrWithContext(error, context);
      this.llmStats.recordFailure();
    }

    return result;
  }

  /**
   * Iterates through available LLM functions, attempting each until successful completion
   * or all options are exhausted.
   */
  private async iterateOverLLMFunctions(
    resourceName: string,
    initialPrompt: string,
    context: LLMContext,
    llmFunctions: LLMFunction[],
    candidateModels?: LLMCandidateFunction[],
    completionOptions?: LLMCompletionOptions,
  ): Promise<LLMGeneratedContent | null> {
    let currentPrompt = initialPrompt;
    let llmFunctionIndex = 0;

    // Don't want to increment 'llmFuncIndex' before looping again, if going to crop prompt
    // (to enable us to try cropped prompt with same size LLM as last iteration)
    while (llmFunctionIndex < llmFunctions.length) {
      const llmResponse = await this.executeLLMFuncWithRetries(
        llmFunctions[llmFunctionIndex],
        currentPrompt,
        context,
        completionOptions,
      );

      if (llmResponse?.status === LLMResponseStatus.COMPLETED) {
        this.llmStats.recordSuccess();
        return llmResponse.generated ?? null;
      } else if (llmResponse?.status === LLMResponseStatus.ERRORED) {
        logErrWithContext(llmResponse.error, context);
        break;
      }

      const nextAction = this.determineUnsuccessfulLLMCallOutcomeAction(
        llmResponse,
        llmFunctionIndex,
        llmFunctions.length,
        context,
        resourceName,
      );
      if (nextAction.shouldTerminate) break;

      if (nextAction.shouldCropPrompt && llmResponse) {
        currentPrompt = this.cropPromptForTokenLimit(currentPrompt, llmResponse);

        if (currentPrompt.trim() === "") {
          logWithContext(
            `Prompt became empty after cropping for resource '${resourceName}', terminating attempts.`,
            context,
          );
          break;
        }

        continue; // Try again with same LLM function but cropped prompt
      }

      if (nextAction.shouldSwitchToNextLLM) {
        if (candidateModels && llmFunctionIndex + 1 < candidateModels.length) {
          context.modelQuality = candidateModels[llmFunctionIndex + 1].modelQuality;
        }

        this.llmStats.recordSwitch();
        llmFunctionIndex++;
      }
    }

    return null;
  }

  /**
   * Send a prompt to an LLM for completion, retrying a number of times if the LLM is overloaded.
   */
  private async executeLLMFuncWithRetries(
    llmFunction: LLMFunction,
    prompt: string,
    context: LLMContext,
    completionOptions?: LLMCompletionOptions,
  ) {
    const retryConfig = getRetryConfiguration(this.providerRetryConfig);
    const result = await withRetry<
      [string, LLMContext, LLMCompletionOptions?],
      LLMFunctionResponse,
      LLMResponseStatus.OVERLOADED | LLMResponseStatus.INVALID
    >(
      llmFunction as RetryFunc<[string, LLMContext, LLMCompletionOptions?], LLMFunctionResponse>,
      [prompt, context, completionOptions],
      this.checkResultThrowIfRetryFunc.bind(this),
      this.logRetryOrInvalidEvent.bind(this),
      retryConfig.maxAttempts,
      retryConfig.minRetryDelayMillis,
    );
    return result;
  }

  /**
   * Check the result and throw an error if the LLM is overloaded or the response is invalid
   */
  private checkResultThrowIfRetryFunc(result: LLMFunctionResponse) {
    if (result.status === LLMResponseStatus.OVERLOADED)
      throw new RetryStatusError("LLM is overloaded", LLMResponseStatus.OVERLOADED);
    if (result.status === LLMResponseStatus.INVALID)
      throw new RetryStatusError("LLM response is invalid", LLMResponseStatus.INVALID);
  }

  /**
   * Log retry events with status-specific handling
   */
  private logRetryOrInvalidEvent(
    error: FailedAttemptError & {
      status?: LLMResponseStatus.OVERLOADED | LLMResponseStatus.INVALID;
    },
  ) {
    if (error.status === LLMResponseStatus.INVALID) {
      this.llmStats.recordInvalidRetry();
    } else {
      this.llmStats.recordOverloadRetry();
    }
  }

  /**
   * Handles the outcome of an LLM call and determines the next action to take.
   */
  private determineUnsuccessfulLLMCallOutcomeAction(
    llmResponse: LLMFunctionResponse | null,
    currentLlmFunctionIndex: number,
    totalLLMCount: number,
    context: LLMContext,
    resourceName: string,
  ): { shouldTerminate: boolean; shouldCropPrompt: boolean; shouldSwitchToNextLLM: boolean } {
    const isInvalidResponse = llmResponse?.status === LLMResponseStatus.INVALID;
    const isOverloaded = !llmResponse || llmResponse.status === LLMResponseStatus.OVERLOADED;
    const isExceeded = llmResponse?.status === LLMResponseStatus.EXCEEDED;
    const canSwitchModel = currentLlmFunctionIndex + 1 < totalLLMCount;

    if (isInvalidResponse) {
      logWithContext(
        `Unable to extract a valid response from the current LLM model - invalid JSON being received even after retries `,
        context,
      );
      return {
        shouldTerminate: !canSwitchModel,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: canSwitchModel,
      };
    } else if (isOverloaded) {
      logWithContext(
        `LLM problem processing prompt with current LLM model because it is overloaded, or timing out, even after retries `,
        context,
      );
      return {
        shouldTerminate: !canSwitchModel,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: canSwitchModel,
      };
    } else if (isExceeded) {
      logWithContext(
        `LLM prompt tokens used ${llmResponse.tokensUage?.promptTokens ?? 0} plus completion tokens used ${llmResponse.tokensUage?.completionTokens ?? 0} exceeded EITHER: 1) the model's total token limit of ${llmResponse.tokensUage?.maxTotalTokens ?? 0}, or: 2) the model's completion tokens limit`,
        context,
      );
      return {
        shouldTerminate: false,
        shouldCropPrompt: !canSwitchModel,
        shouldSwitchToNextLLM: canSwitchModel,
      };
    } else {
      logWithContext(
        `An unknown error occurred while LLMRouter attempted to process the LLM invocation and response for resource '${resourceName}' - terminating response processing - response status received: '${llmResponse.status}'`,
        context,
      );
      return {
        shouldTerminate: true,
        shouldCropPrompt: false,
        shouldSwitchToNextLLM: false,
      };
    }
  }
}
