import { z } from "zod";
import type { LLMCompletionOptions } from "./types/llm-request.types";
import type { ResolvedModelChain } from "./types/llm-model.types";
import { LLMError, LLMErrorCode } from "./types/llm-errors.types";
import type { Result } from "../types/result.types";
import type { LLMModuleConfig } from "./config/llm-module-config.types";
import type { LLMRetryConfig } from "./providers/llm-provider.types";
import { LLMExecutionPipeline, type LLMPipelineConfig } from "./llm-execution-pipeline";
import { ProviderManager } from "./provider-manager";
import { RetryStrategy } from "./strategies/retry-strategy";
import LLMExecutionStats from "./tracking/llm-execution-stats";
import { CompletionService } from "./completion-service";
import { EmbeddingService } from "./embedding-service";
import {
  buildCompletionCandidatesFromChain,
  buildEmbeddingCandidatesFromChain,
} from "./utils/llm-candidate-builder";

/**
 * LLMRouter orchestrates LLM operations across multiple providers with fallback support.
 *
 * Features:
 * - Multi-provider support: Can use models from different providers in a single fallback chain
 * - Configurable fallback: Models are tried in priority order as specified in the chain config
 * - Non-functional concerns: Retries, cropping, statistics tracking are handled automatically
 *
 * Note: Both completion and embedding operations are delegated to their respective services.
 * The executeCompletion and generateEmbeddings methods are retained for API compatibility.
 */
export default class LLMRouter {
  /** Execution statistics for tracking LLM call metrics */
  readonly stats: LLMExecutionStats;

  private readonly providerManager: ProviderManager;
  private readonly modelChain: ResolvedModelChain;
  private readonly completionService: CompletionService;
  private readonly embeddingService: EmbeddingService;

  /**
   * Constructor.
   *
   * @param config The LLM module configuration with resolved model chain
   */
  constructor(config: LLMModuleConfig) {
    this.modelChain = config.resolvedModelChain;

    // Create provider manager with the configuration
    this.providerManager = new ProviderManager({
      resolvedModelChain: config.resolvedModelChain,
      providerParams: config.providerParams,
      errorLogging: config.errorLogging,
      providerRegistry: config.providerRegistry,
    });

    // Build completion candidates from the chain
    const completionCandidates = buildCompletionCandidatesFromChain(
      this.providerManager,
      this.modelChain,
    );

    // Build embedding candidates
    const embeddingCandidates = buildEmbeddingCandidatesFromChain(
      this.providerManager,
      this.modelChain,
    );

    if (completionCandidates.length === 0) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "At least one completion model must be configured in LLM_COMPLETIONS",
      );
    }

    if (embeddingCandidates.length === 0) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "At least one embedding model must be configured in LLM_EMBEDDINGS",
      );
    }

    // Create shared execution pipeline
    this.stats = new LLMExecutionStats();
    const retryStrategy = new RetryStrategy(this.stats);
    const pipelineConfig: LLMPipelineConfig = {
      retryConfig: this.getRetryConfig(),
      getModelsMetadata: () => this.providerManager.getAllModelsMetadata(),
    };
    const executionPipeline = new LLMExecutionPipeline(retryStrategy, this.stats, pipelineConfig);

    // Create completion service with shared dependencies
    this.completionService = new CompletionService({
      completionCandidates,
      modelChain: this.modelChain,
      providerManager: this.providerManager,
      executionPipeline,
    });

    // Create embedding service with shared dependencies
    this.embeddingService = new EmbeddingService({
      embeddingCandidates,
      modelChain: this.modelChain,
      providerManager: this.providerManager,
      executionPipeline,
    });

    console.log(`LLMRouter initialized with: ${this.getModelsUsedDescription()}`);
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
   * Delegates to CompletionService.
   */
  getCompletionChain(): ResolvedModelChain["completions"] {
    return this.completionService.getCompletionChain();
  }

  /**
   * Get the configured embedding model chain.
   * Useful for iterating through models for testing or display purposes.
   */
  getEmbeddingChain(): ResolvedModelChain["embeddings"] {
    return this.embeddingService.getEmbeddingChain();
  }

  /**
   * Get the dimensions for the first embedding model in the chain.
   */
  getEmbeddingModelDimensions(): number | undefined {
    return this.embeddingService.getEmbeddingModelDimensions();
  }

  /**
   * Get the max total tokens for the first completion model in the chain.
   * Delegates to CompletionService.
   */
  getFirstCompletionModelMaxTokens(): number {
    return this.completionService.getFirstCompletionModelMaxTokens();
  }

  /**
   * Send the content to the LLM for it to generate and return the content's embedding.
   *
   * Delegates to the internal EmbeddingService which provides:
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
    return this.embeddingService.generateEmbeddings(resourceName, content, modelIndexOverride);
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
  async executeCompletion<S extends z.ZodType<unknown>>(
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

  // Implementation - delegates to CompletionService
  async executeCompletion<S extends z.ZodType<unknown>>(
    resourceName: string,
    prompt: string,
    options: LLMCompletionOptions<S>,
    modelIndexOverride: number | null = null,
  ): Promise<Result<z.infer<S>, LLMError>> {
    return this.completionService.executeCompletion(
      resourceName,
      prompt,
      options,
      modelIndexOverride,
    );
  }

  /**
   * Get the retry config from the first completion provider in the chain.
   * Used by the execution pipeline for retry behavior.
   */
  private getRetryConfig(): LLMRetryConfig {
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
}
