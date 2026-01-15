/**
 * LLM Provider interface definition.
 */

import type { LLMModelTier, ResolvedLLMModelMetadata } from "./llm-model.types";
import type { LLMFunction, LLMEmbeddingFunction } from "./llm-function.types";
import type { ShutdownBehavior } from "./llm-shutdown.types";

/**
 * Interface for LLM implementation provider.
 *
 * The completion methods use the new LLMFunction type which infers return types
 * from the options.jsonSchema at the call site, enabling end-to-end type safety.
 */
export interface LLMProvider {
  /** Optional feature flags indicating model-specific capabilities or constraints */
  readonly llmFeatures?: readonly string[];

  /** Generate embeddings for content. Returns a fixed number[] type. */
  generateEmbeddings: LLMEmbeddingFunction;

  /**
   * Execute completion using the primary model.
   * Return type is inferred from options.jsonSchema when provided.
   */
  executeCompletionPrimary: LLMFunction;

  /**
   * Execute completion using the secondary model.
   * Return type is inferred from options.jsonSchema when provided.
   */
  executeCompletionSecondary: LLMFunction;

  getModelsNames(): {
    embeddings: string;
    primaryCompletion: string;
    secondaryCompletion?: string;
  };
  getAvailableCompletionModelTiers(): LLMModelTier[];
  getEmbeddingModelDimensions(): number | undefined;
  getModelFamily(): string;
  getModelsMetadata(): Readonly<Record<string, ResolvedLLMModelMetadata>>;
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
