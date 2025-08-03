import { injectable, inject } from "tsyringe";
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
import { log, logWithContext } from "./tracking/llm-router-logging";

import type { LLMRetryConfig } from "../providers/llm-provider.types";
import { LLMProviderManager } from "./llm-provider-manager";
import type { EnvVars } from "../../env/env.types";
import { TOKENS } from "../../di/tokens";
import { LLMExecutionPipeline } from "./llm-execution-pipeline";
import {
  getOverriddenCompletionCandidates,
  buildCompletionCandidates,
} from "./processing/completions-models-retriever";

/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization /
 * completion function:
 *
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
@injectable()
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
    @inject(TOKENS.LLMProviderManager) private readonly llmProviderManager: LLMProviderManager,
    @inject(TOKENS.EnvVars) private readonly envVars: EnvVars,
    private readonly executionPipeline: LLMExecutionPipeline,
  ) {
    this.llm = this.llmProviderManager.getLLMProvider(this.envVars);
    this.modelsMetadata = this.llm.getModelsMetadata();
    const llmManifest = this.llmProviderManager.getLLMManifest();
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
   * Check if the underlying provider needs a forced shutdown.
   */
  providerNeedsForcedShutdown(): boolean {
    return this.llm.needsForcedShutdown();
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
    const models = this.llm.getModelsNames();
    const candidateDescriptions = this.completionCandidates
      .map((candidate) => {
        const modelId =
          candidate.modelQuality === LLMModelQuality.PRIMARY
            ? models.primaryCompletion
            : (models.secondaryCompletion ?? "n/a");
        return `${candidate.modelQuality}: ${modelId}`;
      })
      .join(", ");
    return `${this.llm.getModelFamily()} (embeddings: ${models.embeddings}, completions - ${candidateDescriptions})`;
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
    const { candidatesToUse, candidateFunctions } = getOverriddenCompletionCandidates(
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
}
