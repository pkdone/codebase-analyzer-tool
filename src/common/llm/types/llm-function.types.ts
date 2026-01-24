/**
 * LLM function type definitions for completion and embedding operations.
 */

import { z } from "zod";
import type { LLMContext, LLMCompletionOptions } from "./llm-request.types";
import type { LLMFunctionResponse } from "./llm-response.types";

/**
 * Type for LLM completion functions that require a model key.
 *
 * This is a generic function type where the return type is inferred from the
 * `options.jsonSchema` at the call site, enabling type-safe responses.
 *
 * Generic over the schema type S directly to simplify type inference through
 * the async call chain. The constraint uses z.ZodType<unknown> for consistency
 * across the codebase.
 */
export type LLMModelKeyFunction = <S extends z.ZodType<unknown>>(
  modelKey: string,
  content: string,
  context: LLMContext,
  options?: LLMCompletionOptions<S>,
) => Promise<LLMFunctionResponse<z.infer<S>>>;

/**
 * Type for LLM completion functions (without model key - used for bound functions).
 *
 * This is a generic function type (not a generic type with a function).
 * The return type is inferred from the `options.jsonSchema` at the call site,
 * enabling type-safe responses without requiring explicit type parameters.
 *
 * Generic over the schema type S directly to simplify type inference through
 * the async call chain, avoiding the need for conditional type extraction.
 * The constraint uses z.ZodType<unknown> for consistency across the codebase.
 *
 * The return type uses z.infer<S> for schema-based inference. For TEXT format
 * or when no schema is provided, the generated content will be string or
 * LLMGeneratedContent at runtime.
 *
 * Note: This type is specifically for completions. For embeddings, use
 * LLMEmbeddingFunction instead.
 */
export type LLMFunction = <S extends z.ZodType<unknown>>(
  content: string,
  context: LLMContext,
  options?: LLMCompletionOptions<S>,
) => Promise<LLMFunctionResponse<z.infer<S>>>;

/**
 * Type for embedding functions that always return number[].
 * Embeddings don't use the schema-based type inference.
 */
export type LLMEmbeddingFunction = (
  modelKey: string,
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
 * Priority is determined by position in the chain (index 0 = highest priority).
 */
export interface LLMCandidateFunction {
  /** The completion function bound to a specific model */
  readonly func: LLMFunction;
  /** Provider family this model belongs to */
  readonly providerFamily: string;
  /** Model key within the provider */
  readonly modelKey: string;
  /** Human-readable description of this candidate */
  readonly description: string;
  /** Priority index in the fallback chain (0 = highest priority) */
  readonly priority: number;
}

/**
 * A unified execution candidate that combines the bound function with its metadata.
 * This eliminates the need to pass separate arrays that must be kept in sync by index,
 * reducing the risk of index mismatch errors and simplifying the execution pipeline.
 *
 * @template T - The response data type (z.infer<S> for completions, number[] for embeddings)
 */
export interface ExecutableCandidate<T> {
  /** The bound function ready for execution with options already applied */
  readonly execute: BoundLLMFunction<T>;
  /** Provider family this model belongs to */
  readonly providerFamily: string;
  /** Model key within the provider */
  readonly modelKey: string;
  /** Human-readable description for logging */
  readonly description: string;
}
