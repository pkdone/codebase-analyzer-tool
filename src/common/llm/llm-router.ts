import { z } from "zod";
import type { LLMContext, LLMCompletionOptions } from "./types/llm-request.types";
import { LLMPurpose } from "./types/llm-request.types";
import type { ResolvedModelChain } from "./types/llm-model.types";
import type {
  LLMCandidateFunction,
  EmbeddingCandidate,
  ExecutableCandidate,
} from "./types/llm-function.types";
import type { LLMResponsePayload } from "./types/llm-response.types";
import { LLMError, LLMErrorCode } from "./types/llm-errors.types";
import { type Result, ok, err, isErr } from "../types/result.types";
import type { LLMExecutionPipeline } from "./llm-execution-pipeline";
import type { ProviderManager } from "./provider-manager";
import type LLMExecutionStats from "./tracking/llm-execution-stats";
import {
  buildCompletionCandidatesFromChain,
  buildEmbeddingCandidatesFromChain,
  buildExecutableCandidates,
  buildExecutableEmbeddingCandidates,
} from "./utils/llm-candidate-builder";
import { logWarn } from "../utils/logging";
import { llmConfig } from "./config/llm.config";

/**
 * LLMRouter orchestrates LLM operations across multiple providers with fallback support.
 *
 * Features:
 * - Multi-provider support: Can use models from different providers in a single fallback chain
 * - Configurable fallback: Models are tried in priority order as specified in the chain config
 * - Non-functional concerns: Retries, cropping, statistics tracking are handled automatically
 *
 * The router directly handles both completion and embedding operations, using the
 * execution pipeline for retry logic, prompt cropping, and fallback behavior.
 *
 * Dependencies are injected via constructor for improved testability.
 * Use the factory function `createLLMRouter` for standard instantiation.
 */
export default class LLMRouter {
  /** Execution statistics for tracking LLM call metrics */
  readonly stats: LLMExecutionStats;

  private readonly providerManager: ProviderManager;
  private readonly modelChain: ResolvedModelChain;
  private readonly executionPipeline: LLMExecutionPipeline;
  private readonly completionCandidates: LLMCandidateFunction[];
  private readonly embeddingCandidates: EmbeddingCandidate[];

  /**
   * Constructor with dependency injection.
   *
   * @param modelChain The resolved model chain configuration
   * @param providerManager The provider manager for accessing LLM providers
   * @param executionPipeline The execution pipeline for handling retries and fallbacks
   * @param stats The execution statistics tracker
   */
  constructor(
    modelChain: ResolvedModelChain,
    providerManager: ProviderManager,
    executionPipeline: LLMExecutionPipeline,
    stats: LLMExecutionStats,
  ) {
    this.modelChain = modelChain;
    this.providerManager = providerManager;
    this.executionPipeline = executionPipeline;
    this.stats = stats;

    // Build completion candidates from the chain
    this.completionCandidates = buildCompletionCandidatesFromChain(
      this.providerManager,
      this.modelChain,
    );

    // Build embedding candidates
    this.embeddingCandidates = buildEmbeddingCandidatesFromChain(
      this.providerManager,
      this.modelChain,
    );

    if (this.completionCandidates.length === 0) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "At least one completion model must be configured in LLM_COMPLETION_MODEL_CHAIN",
      );
    }

    if (this.embeddingCandidates.length === 0) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "At least one embedding model must be configured in LLM_EMBEDDING_MODEL_CHAIN",
      );
    }

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
   *
   * @returns The embedding dimensions, or undefined if no candidates are available
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
    if (this.completionCandidates.length === 0) return llmConfig.DEFAULT_MAX_TOKENS_FALLBACK;
    const firstEntry = this.modelChain.completions[0];
    const metadata = this.providerManager.getModelMetadata(
      firstEntry.providerFamily,
      firstEntry.modelKey,
    );
    return metadata?.maxTotalTokens ?? llmConfig.DEFAULT_MAX_TOKENS_FALLBACK;
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
   * @returns The embedding vector as number[], or null if generation fails
   */
  async generateEmbeddings(
    resourceName: string,
    content: string,
    modelIndexOverride: number | null = null,
  ): Promise<number[] | null> {
    const baseContext: Omit<LLMContext, "modelKey"> = {
      resource: resourceName,
      purpose: LLMPurpose.EMBEDDINGS,
    };

    // Build unified executable candidates for embeddings
    let candidates;
    try {
      candidates = buildExecutableEmbeddingCandidates(this.embeddingCandidates, modelIndexOverride);
    } catch {
      logWarn(
        `No embedding candidates available at index ${modelIndexOverride ?? 0}. Chain has ${this.embeddingCandidates.length} models.`,
        baseContext as LLMContext,
      );
      return null;
    }

    const context: LLMContext = {
      ...baseContext,
      modelKey: candidates[0].modelKey,
    };

    const result = await this.executionPipeline.executeEmbedding({
      resourceName,
      content,
      context,
      candidates,
    });

    if (isErr(result)) {
      return null;
    }

    if (!Array.isArray(result.value)) {
      logWarn(
        `Embedding response has invalid type: expected number[] but got ${typeof result.value}`,
        context,
      );
      return null;
    }

    return result.value;
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

  // Implementation
  async executeCompletion<S extends z.ZodType<unknown>>(
    resourceName: string,
    prompt: string,
    options: LLMCompletionOptions<S>,
    modelIndexOverride: number | null = null,
  ): Promise<Result<z.infer<S>, LLMError>> {
    // Build unified executable candidates with options bound
    const candidates = buildExecutableCandidates(
      this.completionCandidates,
      options,
      modelIndexOverride,
    );

    const firstCandidate = candidates[0];
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.COMPLETIONS,
      modelKey: firstCandidate.modelKey,
      outputFormat: options.outputFormat,
    };

    // Type assertion is safe here: when a schema is provided, z.infer<S> produces
    // an object type that satisfies LLMResponsePayload. When no schema is provided,
    // the response handling in BaseLLMProvider ensures the data is LLMResponsePayload.
    // The pipeline's T extends LLMResponsePayload constraint ensures internal type safety,
    // while this assertion bridges the wider z.ZodType<unknown> constraint used at the API level.
    type InferredType = z.infer<S> extends LLMResponsePayload ? z.infer<S> : LLMResponsePayload;
    const result = await this.executionPipeline.executeCompletion<InferredType>({
      resourceName,
      content: prompt,
      context,
      candidates: candidates as ExecutableCandidate<InferredType>[],
    });

    if (isErr(result)) {
      logWarn(`Failed to execute completion: ${result.error.message}`, context);
      return err(
        new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, result.error.message, {
          resourceName,
          context,
        }),
      );
    }

    return ok(result.value);
  }
}
