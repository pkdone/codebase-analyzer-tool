import { logWarn } from "../../../utils/logging";
import type { Sanitizer, SanitizerResult } from "./sanitizers-types";

/**
 * Higher-order function that wraps a sanitizer with standardized error handling.
 *
 * This eliminates the repetitive try/catch pattern across sanitizers by:
 * 1. Executing the sanitizer logic
 * 2. Catching any errors that occur
 * 3. Logging the error with the sanitizer name
 * 4. Returning a safe failure result that preserves the original input
 *
 * ## Usage
 * Wrap your sanitizer implementation to get automatic error handling:
 *
 * ```typescript
 * // Before:
 * export const mySanitizer: Sanitizer = (input) => {
 *   try {
 *     // sanitizer logic...
 *     return { content: result, changed: true };
 *   } catch (error) {
 *     logWarn(`mySanitizer sanitizer failed: ${String(error)}`);
 *     return { content: input, changed: false, repairs: [`Sanitizer failed: ${String(error)}`] };
 *   }
 * };
 *
 * // After:
 * export const mySanitizer: Sanitizer = withSanitizerErrorHandling(
 *   "mySanitizer",
 *   (input) => {
 *     // sanitizer logic - no try/catch needed
 *     return { content: result, changed: true };
 *   }
 * );
 * ```
 *
 * @param name - The sanitizer name for error messages (e.g., "normalizeCharacters")
 * @param sanitizer - The sanitizer function to wrap
 * @returns A new sanitizer function with error handling applied
 */
export function withSanitizerErrorHandling(name: string, sanitizer: Sanitizer): Sanitizer {
  return (input, config): SanitizerResult => {
    try {
      return sanitizer(input, config);
    } catch (error) {
      logWarn(`${name} sanitizer failed: ${String(error)}`);
      return {
        content: input,
        changed: false,
        description: undefined,
        repairs: [`Sanitizer failed: ${String(error)}`],
      };
    }
  };
}
