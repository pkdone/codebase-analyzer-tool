import { z } from "zod";
import type { LLMContext, LLMCompletionOptions } from "./types/llm-request.types";
import { LLMPurpose } from "./types/llm-request.types";
import type { ResolvedLLMModelMetadata, ResolvedModelChain } from "./types/llm-model.types";
import type { BoundLLMFunction, LLMCandidateFunction } from "./types/llm-function.types";
import { ShutdownBehavior } from "./types/llm-shutdown.types";
import { LLMError, LLMErrorCode } from "./types/llm-errors.types";
import { type Result, ok, err } from "../types/result.types";
import type { LLMRetryConfig } from "./providers/llm-provider.types";
import type { LLMModuleConfig } from "./config/llm-module-config.types";
import { LLMExecutionPipeline } from "./llm-execution-pipeline";
import { ProviderManager } from "./provider-manager";
import {
  buildCompletionCandidatesFromChain,
  buildEmbeddingCandidatesFromChain,
  getFilteredCompletionCandidates,
} from "./utils/completions-models-retriever";
import { logWarn } from "../utils/logging";

/**
 * LLMRouter orchestrates LLM operations across multiple providers with fallback support.
 *
 * Features:
 * - Multi-provider support: Can use models from different providers in a single fallback chain
 * - Configurable fallback: Models are tried in priority order as specified in the chain config
 * - Unified execution: Both completions and embeddings go through the same execution pipeline
 * - Non-functional concerns: Retries, cropping, statistics tracking are handled automatically
 */
export default class LLMRouter {
  private readonly providerManager: ProviderManager;
  private readonly completionCandidates: LLMCandidateFunction[];
  private readonly embeddingCandidates: ReturnType<typeof buildEmbeddingCandidatesFromChain>;
  private readonly modelChain: ResolvedModelChain;

  /**
   * Constructor.
   *
   * @param config The LLM module configuration with resolved model chain
   * @param executionPipeline The execution pipeline for orchestrating LLM calls
   */
  constructor(
    config: LLMModuleConfig,
    private readonly executionPipeline: LLMExecutionPipeline,
  ) {
    this.modelChain = config.resolvedModelChain;

    // Create provider manager with the configuration
    this.providerManager = new ProviderManager({
      resolvedModelChain: config.resolvedModelChain,
      providerParams: config.providerParams,
      errorLogging: config.errorLogging,
    });

    // Build completion and embedding candidates from the chain
    this.completionCandidates = buildCompletionCandidatesFromChain(
      this.providerManager,
      this.modelChain,
    );
    this.embeddingCandidates = buildEmbeddingCandidatesFromChain(
      this.providerManager,
      this.modelChain,
    );

    if (this.completionCandidates.length === 0) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "At least one completion model must be configured in LLM_COMPLETIONS",
      );
    }

    if (this.embeddingCandidates.length === 0) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "At least one embedding model must be configured in LLM_EMBEDDINGS",
      );
    }

    console.log(`LLMRouter initialized with: ${this.getModelsUsedDescription()}`);
  }

  /**
   * Get the shutdown behavior required by the underlying providers.
   * Returns REQUIRES_PROCESS_EXIT if any provider requires it.
   */
  getProviderShutdownBehavior(): ShutdownBehavior {
    return this.providerManager.requiresProcessExit()
      ? ShutdownBehavior.REQUIRES_PROCESS_EXIT
      : ShutdownBehavior.GRACEFUL;
  }

  /**
   * Get the names of providers that require forced process exit for cleanup.
   */
  getProvidersRequiringProcessExit(): string[] {
    return this.providerManager.getProvidersRequiringProcessExit();
  }

  /**
   * Shutdown all providers gracefully.
   */
  async shutdown(): Promise<void> {
    await this.providerManager.shutdown();
  }

  /**
   * Validate credentials for all providers in the chain.
   * Should be called at startup to fail fast if credentials are invalid.
   */
  async validateCredentials(): Promise<void> {
    await this.providerManager.validateAllCredentials();
  }

  /**
   * Get a human-readable description of all models in the configured chains.
   */
  getModelsUsedDescription(): string {
    const completionModels = this.modelChain.completions
      .map((e) => `${e.providerFamily}/${e.modelKey}`)
      .join(", ");
    const embeddingModels = this.modelChain.embeddings
      .map((e) => `${e.providerFamily}/${e.modelKey}`)
      .join(", ");

    return `Completions: [${completionModels}] | Embeddings: [${embeddingModels}]`;
  }

  /**
   * Get the configured completion model chain.
   * Useful for iterating through models for testing or display purposes.
   */
  getCompletionChain(): ResolvedModelChain["completions"] {
    return this.modelChain.completions;
  }

  /**
   * Get the configured embedding model chain.
   * Useful for iterating through models for testing or display purposes.
   */
  getEmbeddingChain(): ResolvedModelChain["embeddings"] {
    return this.modelChain.embeddings;
  }

  /**
   * Get the dimensions for the first embedding model in the chain.
   */
  getEmbeddingModelDimensions(): number | undefined {
    if (this.embeddingCandidates.length === 0) return undefined;

    const firstEntry = this.modelChain.embeddings[0];
    const provider = this.providerManager.getProvider(firstEntry.providerFamily);
    return provider.getEmbeddingModelDimensions(firstEntry.modelKey);
  }

  /**
   * Get the max total tokens for the first completion model in the chain.
   * Useful for chunking calculations.
   */
  getFirstCompletionModelMaxTokens(): number {
    const defaultMaxTokens = 128000;
    if (this.completionCandidates.length === 0) return defaultMaxTokens;

    const firstEntry = this.modelChain.completions[0];
    const metadata = this.providerManager.getModelMetadata(
      firstEntry.providerFamily,
      firstEntry.modelKey,
    );
    return metadata?.maxTotalTokens ?? defaultMaxTokens;
  }

  /**
   * Send the content to the LLM for it to generate and return the content's embedding.
   *
   * Uses the execution pipeline which provides:
   * - Retry logic for overloaded models
   * - Prompt cropping when content exceeds context window
   * - Statistics tracking (success, failure, retries, crops)
   * - Consistent error handling and logging
   * - Fallback to next embedding model if configured
   *
   * @param resourceName Name of the resource being processed
   * @param content Content to generate embeddings for
   * @param modelIndexOverride Optional index to start from a specific model in the chain
   */
  async generateEmbeddings(
    resourceName: string,
    content: string,
    modelIndexOverride: number | null = null,
  ): Promise<number[] | null> {
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.EMBEDDINGS,
    };

    // Filter candidates based on model index override
    const startIndex = modelIndexOverride ?? 0;
    const candidatesToUse = this.embeddingCandidates.slice(startIndex);

    if (candidatesToUse.length === 0) {
      logWarn(
        `No embedding candidates available at index ${startIndex}. Chain has ${this.embeddingCandidates.length} models.`,
        context,
      );
      return null;
    }

    // Build bound functions for filtered embedding candidates
    const embeddingFunctions: BoundLLMFunction<number[]>[] = candidatesToUse.map(
      (candidate) => async (c: string, ctx: LLMContext) => candidate.func(c, ctx),
    );

    const result = await this.executionPipeline.execute<number[]>({
      resourceName,
      content,
      context,
      llmFunctions: embeddingFunctions,
      providerRetryConfig: this.getRetryConfig(),
      modelsMetadata: this.getModelsMetadata(),
      retryOnInvalid: false, // Embeddings don't have JSON parsing
      trackJsonMutations: false, // No JSON mutations for embeddings
    });

    if (!result.success) {
      return null;
    }

    if (!Array.isArray(result.data)) {
      logWarn(
        `Embedding response has invalid type: expected number[] but got ${typeof result.data}`,
        context,
      );
      return null;
    }

    return result.data;
  }

  /**
   * Send the prompt to the LLM and retrieve the LLM's answer.
   *
   * When options.jsonSchema is provided, this method will:
   * - Use native JSON mode capabilities where available
   * - Fall back to text parsing for providers that don't support structured output
   * - Validate the response against the provided Zod schema
   * - Return the validated, typed result (inferred from the schema)
   *
   * Models are tried in priority order as specified in the chain config.
   * An optional modelIndex can be provided to start from a specific model.
   *
   * The return type is a Result discriminated union that forces explicit error handling:
   * - When jsonSchema is provided, returns Result<z.infer<typeof schema>, LLMError>
   * - When jsonSchema is not provided (TEXT mode), returns Result<string, LLMError>
   */
  // Overload for JSON with a specific schema
  async executeCompletion<S extends z.ZodType>(
    resourceName: string,
    prompt: string,
    options: LLMCompletionOptions<S> & { jsonSchema: S },
    modelIndexOverride?: number | null,
  ): Promise<Result<z.infer<S>, LLMError>>;

  // Overload for plain TEXT (without jsonSchema)
  async executeCompletion(
    resourceName: string,
    prompt: string,
    options: Omit<LLMCompletionOptions, "jsonSchema">,
    modelIndexOverride?: number | null,
  ): Promise<Result<string, LLMError>>;

  // Implementation
  async executeCompletion<S extends z.ZodType>(
    resourceName: string,
    prompt: string,
    options: LLMCompletionOptions<S>,
    modelIndexOverride: number | null = null,
  ): Promise<Result<z.infer<S>, LLMError>> {
    const { candidatesToUse, candidateFunctions } = getFilteredCompletionCandidates(
      this.completionCandidates,
      modelIndexOverride,
    );

    const firstCandidate = candidatesToUse[0];
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.COMPLETIONS,
      modelKey: firstCandidate.modelKey,
      outputFormat: options.outputFormat,
    };

    // Bind options to create BoundLLMFunction<z.infer<S>>[] for the unified pipeline
    const boundFunctions: BoundLLMFunction<z.infer<S>>[] = candidateFunctions.map(
      (fn) => async (content: string, ctx: LLMContext) => fn(content, ctx, options),
    );

    const result = await this.executionPipeline.execute<z.infer<S>>({
      resourceName,
      content: prompt,
      context,
      llmFunctions: boundFunctions,
      providerRetryConfig: this.getRetryConfig(),
      modelsMetadata: this.getModelsMetadata(),
      candidateModels: candidatesToUse,
      retryOnInvalid: true,
      trackJsonMutations: true,
    });

    if (!result.success) {
      logWarn(`Failed to execute completion: ${result.error.message}`, context);
      return err(
        new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, result.error.message, {
          resourceName,
          context,
        }),
      );
    }

    return ok(result.data);
  }

  /**
   * Get the retry config from the first completion provider in the chain.
   * Used by the execution pipeline for retry behavior.
   */
  private getRetryConfig(): LLMRetryConfig {
    if (this.completionCandidates.length === 0) {
      throw new LLMError(LLMErrorCode.BAD_CONFIGURATION, "No completion candidates configured");
    }

    const firstEntry = this.modelChain.completions[0];
    const manifest = this.providerManager.getManifest(firstEntry.providerFamily);
    if (!manifest) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        `Manifest not found for provider: ${firstEntry.providerFamily}`,
      );
    }

    return manifest.providerSpecificConfig;
  }

  /**
   * Get aggregated model metadata from all providers.
   */
  private getModelsMetadata(): Record<string, ResolvedLLMModelMetadata> {
    return this.providerManager.getAllModelsMetadata();
  }
}
