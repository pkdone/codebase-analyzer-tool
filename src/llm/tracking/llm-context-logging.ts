import { LLMContext } from "../types/llm.types";
import { logSingleLineWarning } from "../../common/utils/logging";

/**
 * Log info/error text to the console or a redirected-to file
 */
export function log(text: string): void {
  console.log(text);
}

/**
 * Log a warning for LLM pipeline operations.
 */
export function logLlmPipelineWarning(text: string): void {
  console.warn(text);
}

/**
 * Log both the error content and also any context associated with work being done when the
 * error occurred, add the context to the error object and then throw the augmented error.
 */
export function logErrorWithContext(error: unknown, context: LLMContext): void {
  logSingleLineWarning(`LLM Error for resource '${context.resource}'`, error);
}

/**
 * Log the message and the associated context keys and values.
 */
export function logWithContext(msg: string, context: LLMContext): void {
  logSingleLineWarning(msg, context);
}
