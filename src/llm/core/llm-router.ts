import {
  LLMContext,
  LLMFunction,
  LLMModelQuality,
  LLMPurpose,
  LLMResponseStatus,
  LLMGeneratedContent,
  ResolvedLLMModelMetadata,
  LLMCompletionOptions,
} from "../llm.types";
import type { LLMProviderImpl, LLMCandidateFunction } from "../llm.types";
import { BadConfigurationLLMError } from "../errors/llm-errors.types";

import {
  log,
  logErrWithContext,
  logWithContext,
} from "../processing/routerTracking/llm-router-logging";
import type LLMStats from "../processing/routerTracking/llm-stats";
import type { LLMRetryConfig } from "../providers/llm-provider.types";
import { LLMService } from "./llm-service";
import type { EnvVars } from "../../lifecycle/env.types";
import { RetryStrategy } from "./strategies/retry-strategy";
import { FallbackStrategy } from "./strategies/fallback-strategy";
import { PromptAdaptationStrategy } from "./strategies/prompt-adaptation-strategy";

import {
  getOverridenCompletionCandidates,
  buildCompletionCandidates,
} from "../processing/msgProcessing/request-configurer";
import { validateSchemaIfNeededAndReturnResponse } from "../processing/msgProcessing/content-tools";

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
   * @param retryStrategy Strategy for handling retries
   * @param fallbackStrategy Strategy for handling unsuccessful calls
   * @param promptAdaptationStrategy Strategy for adapting prompts when token limits are exceeded
   */
  constructor(
    private readonly llmService: LLMService,
    private readonly envVars: EnvVars,
    private readonly llmStats: LLMStats,
    private readonly retryStrategy: RetryStrategy,
    private readonly fallbackStrategy: FallbackStrategy,
    private readonly promptAdaptationStrategy: PromptAdaptationStrategy,
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

    try {
      result = await this.iterateOverLLMFunctions(
        resourceName,
        prompt,
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
      const llmResponse = await this.retryStrategy.executeWithRetries(
        llmFunctions[llmFunctionIndex],
        currentPrompt,
        context,
        this.providerRetryConfig,
        completionOptions,
      );

      if (llmResponse?.status === LLMResponseStatus.COMPLETED) {
        this.llmStats.recordSuccess();
        return llmResponse.generated ?? null;
      } else if (llmResponse?.status === LLMResponseStatus.ERRORED) {
        logErrWithContext(llmResponse.error, context);
        break;
      }

      const nextAction = this.fallbackStrategy.determineNextAction(
        llmResponse,
        llmFunctionIndex,
        llmFunctions.length,
        context,
        resourceName,
      );

      if (nextAction.shouldTerminate) break;

      if (nextAction.shouldCropPrompt && llmResponse) {
        currentPrompt = this.promptAdaptationStrategy.adaptPromptFromResponse(
          currentPrompt,
          llmResponse,
          this.modelsMetadata,
        );
        this.llmStats.recordCrop();

        if (currentPrompt.trim() === "") {
          logWithContext(
            `Prompt became empty after cropping for resource '${resourceName}', terminating attempts.`,
            context,
          );
          break;
        }

        continue; // Try again with same LLM eeeeeefunction but cropped prompt
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
}
