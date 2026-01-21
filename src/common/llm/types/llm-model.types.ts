/**
 * LLM model metadata and chain reference types.
 */

import type { LLMPurpose } from "./llm-request.types";

/**
 * Strongly-typed feature flags for LLM model capabilities and constraints.
 * These flags control provider-specific behavior and parameter handling.
 */
export type LLMModelFeature =
  /** Model requires fixed temperature (cannot be customized) */
  | "fixed_temperature"
  /** Model uses max_completion_tokens parameter instead of max_tokens */
  | "max_completion_tokens";

/**
 * Model metadata for manifest declarations.
 * This defines a model's capabilities and constraints.
 * The urnEnvKey references an environment variable containing the actual model URN/identifier
 * used by the provider API (e.g., ARN, inference profile ID, or model name).
 *
 * Notes:
 *  - For Completions LLMs, the total allowed tokens is the sum of the prompt tokens and the
 *    completion tokens.
 *  - For Embeddings LLMs, the total allowed tokens is the amount of prompt tokens only (the
 *    response is a fixed size array of numbers).
 */
export interface LLMModelMetadata {
  /** The string identifier for this model within its provider */
  readonly modelKey: string;
  /** Whether this is an embedding or completion model */
  readonly purpose: LLMPurpose;
  /** The environment variable key containing the model URN/identifier for API calls */
  readonly urnEnvKey: string;
  /** Number of dimensions for embedding models */
  readonly dimensions?: number;
  /** Maximum completion tokens for completion models */
  readonly maxCompletionTokens?: number;
  /** Maximum total tokens (prompt + completion) */
  readonly maxTotalTokens: number;
  /** Optional array of feature flags indicating model-specific capabilities or constraints */
  readonly features?: readonly LLMModelFeature[];
}

/**
 * Resolved model metadata with URN.
 * This is used in LLM implementations after the model URN has been resolved from the chain config.
 */
export interface ResolvedLLMModelMetadata extends LLMModelMetadata {
  /** The actual model ID/name used by the provider API - resolved from chain config */
  readonly urn: string;
}

/**
 * Reference to a specific model in the chain configuration.
 * Combines provider family, model key, and the resolved URN.
 */
export interface ModelChainEntry {
  /** The provider family identifier (e.g., "VertexAIGemini", "BedrockClaude") */
  readonly providerFamily: string;
  /** The model key within the provider (e.g., "gemini-2.5-pro", "bedrock-claude-opus-4.5") */
  readonly modelKey: string;
  /** The resolved model URN/identifier for the provider API */
  readonly modelUrn: string;
}

/**
 * Complete model chain configuration for both completions and embeddings.
 * Models are ordered by priority (index 0 is highest priority).
 */
export interface ResolvedModelChain {
  /** Ordered list of completion models to try (first is highest priority) */
  readonly completions: readonly ModelChainEntry[];
  /** Ordered list of embedding models to try (first is highest priority) */
  readonly embeddings: readonly ModelChainEntry[];
}
