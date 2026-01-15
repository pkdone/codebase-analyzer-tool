/**
 * LLM Types - Barrel file for backward compatibility.
 *
 * This file re-exports all LLM types from their new modular locations.
 * Existing imports from this file will continue to work without changes.
 *
 * For new code, consider importing directly from the specific type modules:
 * - llm-provider.interface.ts - LLMProvider interface
 * - llm-model.types.ts - Model metadata and tiers
 * - llm-request.types.ts - Context and completion options
 * - llm-response.types.ts - Response types and status
 * - llm-function.types.ts - Function type definitions
 * - llm-stats.types.ts - Statistics types
 * - llm-shutdown.types.ts - Shutdown behavior enum
 */

// Re-export provider interface
export type { LLMProvider } from "./llm-provider.interface";

// Re-export shutdown behavior
export { ShutdownBehavior } from "./llm-shutdown.types";
export type { ShutdownBehavior as ShutdownBehaviorType } from "./llm-shutdown.types";

// Re-export model types
export { LLMModelTier } from "./llm-model.types";
export type {
  LLMModelKeysSet,
  LLMModelFeature,
  LLMModelMetadata,
  ResolvedLLMModelMetadata,
} from "./llm-model.types";

// Re-export request types
export {
  LLMPurpose,
  LLMOutputFormat,
  isJsonOptionsWithSchema,
  isTextOptions,
} from "./llm-request.types";
export type {
  LLMCompletionOptions,
  JsonCompletionOptions,
  TextCompletionOptions,
  LLMContext,
} from "./llm-request.types";

// Re-export response types
export { LLMResponseStatus, createTokenUsageRecord } from "./llm-response.types";
export type {
  LLMResponseTokensUsage,
  LLMGeneratedContent,
  InferResponseType,
  LLMFunctionResponse,
} from "./llm-response.types";

// Re-export function types
export type {
  LLMFunction,
  LLMEmbeddingFunction,
  BoundLLMFunction,
  LLMCandidateFunction,
} from "./llm-function.types";

// Re-export stats types
export type {
  LLMStatsCategoryStatus,
  LLMStatsCategoriesBase,
  LLMStatsCategoriesSummary,
  LLMErrorMsgRegExPattern,
} from "./llm-stats.types";
