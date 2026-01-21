/**
 * LLM Provider interface definition.
 */

import type { ResolvedLLMModelMetadata } from "./llm-model.types";
import type { LLMModelKeyFunction, LLMEmbeddingFunction } from "./llm-function.types";
import type { ShutdownBehavior } from "./llm-shutdown.types";

/**
 * Interface for LLM implementation provider.
 *
 * Providers support N models for both completions and embeddings.
 * Model selection is done via model key, allowing the router to build
 * flexible fallback chains across multiple providers.
 */
export interface LLMProvider {
  /** Optional feature flags indicating model-specific capabilities or constraints */
  readonly llmFeatures?: readonly string[];

  /**
   * Generate embeddings for content using the specified model.
   * Returns a fixed number[] type.
   * @param modelKey The model key to use for embedding generation
   */
  generateEmbeddings: LLMEmbeddingFunction;

  /**
   * Execute completion using the specified model.
   * Return type is inferred from options.jsonSchema when provided.
   * @param modelKey The model key to use for completion
   */
  executeCompletion: LLMModelKeyFunction;

  /**
   * Get the names of all available models from this provider.
   * Returns arrays of model names for embeddings and completions.
   */
  getAvailableModelNames(): {
    embeddings: readonly string[];
    completions: readonly string[];
  };

  /**
   * Get the model keys available for completion operations.
   */
  getAvailableCompletionModelKeys(): readonly string[];

  /**
   * Get the model keys available for embedding operations.
   */
  getAvailableEmbeddingModelKeys(): readonly string[];

  /**
   * Get the dimensions for a specific embedding model.
   * @param modelKey The model key to get dimensions for
   */
  getEmbeddingModelDimensions(modelKey: string): number | undefined;

  /**
   * Get the model family identifier for this provider.
   */
  getModelFamily(): string;

  /**
   * Get metadata for all resolved models in this provider.
   */
  getModelsMetadata(): Readonly<Record<string, ResolvedLLMModelMetadata>>;

  /**
   * Close/cleanup the provider resources.
   */
  close(): Promise<void>;

  /**
   * Get the shutdown behavior required by this provider.
   * Used by the application lifecycle to determine how to clean up.
   */
  getShutdownBehavior(): ShutdownBehavior;

  /**
   * Validate provider credentials are available and not expired.
   * Throws if credentials are invalid, providing fail-fast behavior at startup.
   */
  validateCredentials(): Promise<void>;
}
