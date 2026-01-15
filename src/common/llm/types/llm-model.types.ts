/**
 * LLM model metadata and tier types.
 */

import type { LLMPurpose } from "./llm-request.types";

/**
 * Enum to define the model tier (primary or secondary) for fallback chain positioning
 */
export const LLMModelTier = {
  PRIMARY: "primary",
  SECONDARY: "secondary",
} as const;
export type LLMModelTier = (typeof LLMModelTier)[keyof typeof LLMModelTier];

/**
 * Types to define the status types statistics
 */
export interface LLMModelKeysSet {
  embeddingsModelKey: string;
  primaryCompletionModelKey: string;
  secondaryCompletionModelKey?: string;
}

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
 * Base interface for LLM model metadata containing all common fields.
 *
 * Notes:
 *  - For Completions LLMs, the total allowed tokens is the sum of the prompt tokens and the
 *    completion tokens.
 *  - For Embeddings LLMs, the total allowed tokens is the amount of prompt tokens only (the
 *    response is a fixed size array of numbers).
 */
interface BaseLLMModelMetadata {
  /** The string identifier for this model */
  readonly modelKey: string;
  /** User-friendly name for the model, defined in its manifest */
  readonly name: string;
  /** Whether this is an embedding or completion model */
  readonly purpose: LLMPurpose;
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
 * Type to define the main characteristics of the LLM model with declarative URN resolution.
 */
export interface LLMModelMetadata extends BaseLLMModelMetadata {
  /** The environment variable key that contains the actual model ID/name used by the provider API */
  readonly urnEnvKey: string;
}

/**
 * Type to define resolved model metadata where URNs are always strings.
 * This is used in LLM implementations after environment resolution.
 */
export interface ResolvedLLMModelMetadata extends BaseLLMModelMetadata {
  /** The actual model ID/name used by the provider API - always a resolved string */
  readonly urn: string;
}
