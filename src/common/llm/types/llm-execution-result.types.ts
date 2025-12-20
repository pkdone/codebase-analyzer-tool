import { z } from "zod";
import type {
  LLMContext,
  LLMCompletionOptions,
  LLMOutputFormat,
  LLMGeneratedContent,
} from "./llm.types";

/**
 * Error class for LLM execution pipeline failures
 */
export class LLMExecutionError extends Error {
  readonly resourceName: string;
  readonly context?: LLMContext;
  readonly errorCause?: unknown;

  constructor(message: string, resourceName: string, context?: LLMContext, cause?: unknown) {
    super(message);
    this.resourceName = resourceName;
    this.context = context;
    this.errorCause = cause;
  }
}

/**
 * Discriminated union result type for LLM execution pipeline operations
 */
export type LLMExecutionResult<T> =
  | { success: true; data: T }
  | { success: false; error: LLMExecutionError };

/**
 * Type-safe discriminated union for execution results based on completion options.
 * This type provides stronger type inference based on the output format:
 * - For JSON with schema: Returns LLMExecutionResult<z.infer<S>>
 * - For JSON without schema: Returns LLMExecutionResult<Record<string, unknown>>
 * - For TEXT: Returns LLMExecutionResult<string>
 * - Otherwise: Returns LLMExecutionResult<LLMGeneratedContent>
 *
 * This enables end-to-end type safety through the LLM execution pipeline
 * by allowing the return type to be inferred from the options at the call site.
 *
 * @template TOptions - The completion options type, used to infer the result data type
 */
export type TypedLLMExecutionResult<TOptions extends LLMCompletionOptions> = TOptions extends {
  outputFormat: typeof LLMOutputFormat.JSON;
  jsonSchema: infer S;
}
  ? S extends z.ZodType
    ? LLMExecutionResult<z.infer<S>>
    : LLMExecutionResult<Record<string, unknown>>
  : TOptions extends { outputFormat: typeof LLMOutputFormat.TEXT }
    ? LLMExecutionResult<string>
    : LLMExecutionResult<LLMGeneratedContent>;
