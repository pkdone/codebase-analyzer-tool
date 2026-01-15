/**
 * LLM function type definitions for completion and embedding operations.
 */

import { z } from "zod";
import type { LLMContext, LLMCompletionOptions } from "./llm-request.types";
import type { LLMFunctionResponse } from "./llm-response.types";
import type { LLMModelTier } from "./llm-model.types";

/**
 * Type for LLM completion functions (text generation with optional JSON schema).
 *
 * This is a generic function type (not a generic type with a function).
 * The return type is inferred from the `options.jsonSchema` at the call site,
 * enabling type-safe responses without requiring explicit type parameters.
 *
 * Generic over the schema type S directly to simplify type inference through
 * the async call chain, avoiding the need for conditional type extraction.
 *
 * The return type uses z.infer<S> for schema-based inference. For TEXT format
 * or when no schema is provided, the generated content will be string or
 * LLMGeneratedContent at runtime.
 *
 * Note: This type is specifically for completions. For embeddings, use
 * LLMEmbeddingFunction instead.
 */
export type LLMFunction = <S extends z.ZodType>(
  content: string,
  context: LLMContext,
  options?: LLMCompletionOptions<S>,
) => Promise<LLMFunctionResponse<z.infer<S>>>;

/**
 * Type for embedding functions that always return number[].
 * Embeddings don't use the schema-based type inference.
 */
export type LLMEmbeddingFunction = (
  content: string,
  context: LLMContext,
  options?: LLMCompletionOptions,
) => Promise<LLMFunctionResponse<number[]>>;

/**
 * A bound LLM function ready for execution with options already applied.
 * Generic over the response data type T, enabling a unified execution pipeline
 * that handles both completions and embeddings.
 *
 * - For completions: T is z.infer<S> where S is the schema type
 * - For embeddings: T is number[]
 *
 * This type allows the execution pipeline to work with a single code path
 * while preserving type safety through the generic parameter.
 */
export type BoundLLMFunction<T> = (
  content: string,
  context: LLMContext,
) => Promise<LLMFunctionResponse<T>>;

/**
 * Type to define a candidate LLM function with its associated metadata.
 * The function uses call-site type inference from options.jsonSchema.
 */
export interface LLMCandidateFunction {
  readonly func: LLMFunction;
  readonly modelTier: LLMModelTier;
  readonly description: string;
}
