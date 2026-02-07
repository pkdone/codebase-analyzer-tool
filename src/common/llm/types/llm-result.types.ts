import type { LLMExecutionError } from "./llm-execution-error.types";

/**
 * Metadata about the LLM execution that produced a result.
 * Captures which model actually executed (not just configured) for traceability.
 */
export interface LLMExecutionMetadata {
  /** Full model identifier in "providerFamily/modelKey" format */
  readonly modelId: string;
  /** The provider family (e.g., "BedrockClaude", "OpenAI") */
  readonly providerFamily: string;
  /** The model key within the provider (e.g., "claude-opus-4.5") */
  readonly modelKey: string;
}

/**
 * Successful LLM result containing the value and execution metadata.
 * @template T - The type of the result value
 */
export interface LLMOkResult<T> {
  readonly ok: true;
  readonly value: T;
  readonly meta: LLMExecutionMetadata;
}

/**
 * Failed LLM result containing the execution error.
 */
export interface LLMErrResult {
  readonly ok: false;
  readonly error: LLMExecutionError;
}

/**
 * Discriminated union type representing either a successful LLM result with metadata
 * or a failed result with an error.
 *
 * Unlike the generic `Result` type, `LLMResult` carries execution metadata (the actual
 * model that succeeded) which is essential for tracking fallback behavior.
 *
 * @template T - The type of the success value
 */
export type LLMResult<T> = LLMOkResult<T> | LLMErrResult;

/**
 * Creates a successful LLM result with execution metadata.
 *
 * @param value - The success value to wrap
 * @param meta - Metadata about the LLM execution
 * @returns An LLMOkResult containing the value and metadata
 */
export function llmOk<T>(value: T, meta: LLMExecutionMetadata): LLMOkResult<T> {
  return { ok: true, value, meta };
}

/**
 * Creates a failed LLM result containing the given error.
 *
 * @param error - The LLMExecutionError to wrap
 * @returns An LLMErrResult containing the error
 */
export function llmErr(error: LLMExecutionError): LLMErrResult {
  return { ok: false, error };
}

/**
 * Type guard that checks if an LLMResult is successful (Ok with metadata).
 *
 * @param result - The LLMResult to check
 * @returns True if the result is Ok, false otherwise
 */
export function isLLMOk<T>(result: LLMResult<T>): result is LLMOkResult<T> {
  return result.ok;
}

/**
 * Type guard that checks if an LLMResult is failed (Err).
 *
 * @param result - The LLMResult to check
 * @returns True if the result is Err, false otherwise
 */
export function isLLMErr<T>(result: LLMResult<T>): result is LLMErrResult {
  return !result.ok;
}

/**
 * Creates execution metadata from provider family and model key.
 *
 * @param modelKey - The model key within the provider
 * @param providerFamily - The provider family name
 * @returns LLMExecutionMetadata with computed modelId
 */
export function createExecutionMetadata(
  modelKey: string,
  providerFamily: string,
): LLMExecutionMetadata {
  return {
    modelId: `${providerFamily}/${modelKey}`,
    providerFamily,
    modelKey,
  };
}
