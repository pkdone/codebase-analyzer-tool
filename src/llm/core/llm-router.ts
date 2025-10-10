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
import { log, logWithContext } from "./tracking/llm-context-logging";

import type { LLMRetryConfig } from "../providers/llm-provider.types";
import { LLMProviderManager } from "./llm-provider-manager";
import type { EnvVars } from "../../env/env.types";
import { TOKENS } from "../../di/tokens";
import { LLMExecutionPipeline } from "./llm-execution-pipeline";
import {
  getOverriddenCompletionCandidates,
  buildCompletionCandidates,
} from "../utils/completions-models-retriever";
import { LLMInfoProvider } from "./llm-info-provider";
import { IShutdownable } from "../../lifecycle/shutdownable.interface";

/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization /
 * completion function:
 *
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
@injectable()
export default class LLMRouter implements IShutdownable {
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
    @inject(TOKENS.LLMInfoProvider) private readonly llmInfoProvider: LLMInfoProvider,
  ) {
    this.llm = this.llmProviderManager.getLLMProvider(this.envVars);
    this.modelsMetadata = this.llm.getModelsMetadata();
    const llmManifest = this.llmProviderManager.getLLMManifest();
    this.providerRetryConfig = llmManifest.providerSpecificConfig;
    this.completionCandidates = buildCompletionCandidates(this.llm);

    if (this.completionCandidates.length === 0) {
      throw new BadConfigurationLLMError(
        "At least one completion candidate function must be provided",
      );
    }

    log(
      `Router LLMs to be used: ${this.llmInfoProvider.getModelsUsedDescription(this.llm, this.completionCandidates)}`,
    );
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
   * Implements IShutdownable interface for graceful shutdown.
   * Closes the LLM provider and handles forced shutdown if needed.
   */
  async shutdown(): Promise<void> {
    await this.close();

    // Handle provider-specific forced shutdown requirements
    if (this.providerNeedsForcedShutdown()) {
      // Known Google Cloud Node.js client limitation:
      // VertexAI SDK doesn't have explicit close() method and HTTP connections may persist
      // This is documented behavior - see: https://github.com/googleapis/nodejs-pubsub/issues/1190
      // Use timeout-based cleanup as the recommended workaround
      void setTimeout(() => {
        console.log("Forced exit because GCP client connections cannot be closed properly");
        process.exit(0);
      }, 1000); // 1 second should be enough for any pending operations
    }
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
    return this.llmInfoProvider.getModelsUsedDescription(this.llm, this.completionCandidates);
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
