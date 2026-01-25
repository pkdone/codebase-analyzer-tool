import type { LLMContext } from "./types/llm-request.types";
import { LLMPurpose } from "./types/llm-request.types";
import type { ResolvedModelChain } from "./types/llm-model.types";
import type { LLMFunctionResponse } from "./types/llm-response.types";
import type { LLMExecutionPipeline } from "./llm-execution-pipeline";
import type { ProviderManager } from "./provider-manager";
import { buildExecutableEmbeddingCandidates } from "./utils/completions-models-retriever";
import { logWarn } from "../utils/logging";

/**
 * Embedding candidate function type.
 */
export interface EmbeddingCandidate {
  func: (content: string, context: LLMContext) => Promise<LLMFunctionResponse<number[]>>;
  providerFamily: string;
  modelKey: string;
  priority: number;
}

/**
 * Dependencies required by the EmbeddingService.
 * Uses constructor injection to avoid tsyringe in common/ folder.
 */
export interface EmbeddingServiceDependencies {
  /** Pre-built embedding candidates from the model chain */
  readonly embeddingCandidates: EmbeddingCandidate[];
  /** The resolved model chain configuration */
  readonly modelChain: ResolvedModelChain;
  /** Provider manager for model metadata access */
  readonly providerManager: ProviderManager;
  /** Shared execution pipeline for retries, cropping, and stats */
  readonly executionPipeline: LLMExecutionPipeline;
}

/**
 * Service dedicated to embedding generation operations.
 *
 * This service encapsulates embedding-specific logic, separating it from the
 * completion-focused LLMRouter. Key responsibilities include:
 * - Generating embeddings through the execution pipeline
 * - Providing embedding model metadata (dimensions, chain info)
 *
 * Features inherited from the execution pipeline:
 * - Retry logic for overloaded models
 * - Prompt cropping when content exceeds context window
 * - Statistics tracking (success, failure, retries, crops)
 * - Fallback to next embedding model if configured
 *
 * Note: This class intentionally does NOT use tsyringe or any DI framework
 * since it resides in src/common/ which must remain portable.
 */
export class EmbeddingService {
  private readonly embeddingCandidates: EmbeddingCandidate[];
  private readonly modelChain: ResolvedModelChain;
  private readonly providerManager: ProviderManager;
  private readonly executionPipeline: LLMExecutionPipeline;

  /**
   * Constructor with manual dependency injection.
   *
   * @param deps Dependencies required for embedding operations
   */
  constructor(deps: EmbeddingServiceDependencies) {
    this.embeddingCandidates = deps.embeddingCandidates;
    this.modelChain = deps.modelChain;
    this.providerManager = deps.providerManager;
    this.executionPipeline = deps.executionPipeline;
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

    const result = await this.executionPipeline.execute<number[]>({
      resourceName,
      content,
      context,
      candidates,
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
   * Check if the service has any embedding candidates configured.
   */
  hasEmbeddingCandidates(): boolean {
    return this.embeddingCandidates.length > 0;
  }
}
