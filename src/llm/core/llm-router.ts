import {
  LLMContext,
  LLMModelQuality,
  LLMPurpose,
  LLMGeneratedContent,
  ResolvedLLMModelMetadata,
  LLMCompletionOptions,
} from "../types/llm.types";
import type { LLMProvider, LLMCandidateFunction } from "../types/llm.types";
import { BadConfigurationLLMError } from "../types/llm-errors.types";
import { log, logWithContext } from "./utils/routerTracking/llm-router-logging";
import type LLMStats from "./utils/routerTracking/llm-stats";
import type { LLMRetryConfig } from "../providers/llm-provider.types";
import { LLMService } from "./llm-service";
import type { EnvVars } from "../../lifecycle/env.types";
import { LLMExecutionPipeline } from "./llm-execution-pipeline";
import {
  getOverridenCompletionCandidates,
  buildCompletionCandidates,
} from "./utils/msgProcessing/completions-models-retriever";

/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization /
 * completion function:
 *
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
export default class LLMRouter {
  // Private fields
  private readonly llm: LLMProvider;
  private readonly modelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  private readonly completionCandidates: LLMCandidateFunction[];
  private readonly providerRetryConfig: LLMRetryConfig;

  /**
   * Constructor.
   *
   * @param llmService The LLM service for provider management
   * @param envVars Environment variables
   * @param llmStats The LLM statistics tracker
   * @param executionPipeline The execution pipeline for orchestrating LLM calls
   */
  constructor(
    private readonly llmService: LLMService,
    private readonly envVars: EnvVars,
    private readonly llmStats: LLMStats,
    private readonly executionPipeline: LLMExecutionPipeline,
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
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.EMBEDDINGS,
    };
    const contentResponse = await this.executionPipeline.executeWithPipeline(
      resourceName,
      content,
      context,
      [this.llm.generateEmbeddings.bind(this.llm)],
      this.providerRetryConfig,
      this.modelsMetadata,
    );
    if (contentResponse === null) return null;

    if (
      !(Array.isArray(contentResponse) && contentResponse.every((item) => typeof item === "number"))
    ) {
      logWithContext("LLM response for embeddings was not an array of numbers", context);
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
    return await this.executionPipeline.executeWithPipeline<T>(
      resourceName,
      prompt,
      context,
      candidateFunctions,
      this.providerRetryConfig,
      this.modelsMetadata,
      candidatesToUse,
      options,
    );
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
}
