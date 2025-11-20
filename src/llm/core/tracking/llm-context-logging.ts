import { LLMContext } from "../../types/llm.types";
import { logThrownError, logSingleLineWarning } from "../../../common/utils/logging";

/**
 * Log info/error text to the console or a redirected-to file
 */
export function log(text: string): void {
  console.log(text);
}

/**
 * Log both the error content and also any context associated with work being done when the
 * error occurred, add the context to the error object and then throw the augmented error.
 */
export function logErrorWithContext(error: unknown, context: LLMContext): void {
  logThrownError(error);
  logSingleLineWarning("Error context", context);
}

/**
 * Log the message and the associated context keys and values.
 */
export function logWithContext(msg: string, context: LLMContext): void {
  logSingleLineWarning(msg, context);
}
