import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that converts curly quotes (smart quotes) to regular ASCII quotes.
 *
 * This sanitizer addresses cases where LLM responses contain Unicode curly quotes
 * instead of regular ASCII quotes, which breaks JSON parsing since JSON only accepts
 * ASCII double quotes (U+0022) for property names and string values.
 *
 * Examples of issues this sanitizer handles:
 * - Left double curly quote: "property": "value" -> "property": "value"
 * - Right double curly quote: "property": "value" -> "property": "value"
 * - Mixed curly quotes: "property": "value" -> "property": "value"
 * - Single curly quotes in code snippets: 'value' -> 'value' (for code examples in strings)
 *
 * Unicode characters handled:
 * - U+201C (left double quotation mark, "): converted to " (U+0022)
 * - U+201D (right double quotation mark, "): converted to " (U+0022)
 * - U+2018 (left single quotation mark, '): converted to ' (U+0027)
 * - U+2019 (right single quotation mark, '): converted to ' (U+0027)
 *
 * Strategy:
 * Uses a single pass replacement to convert all curly quotes to their ASCII equivalents.
 * This is safe to do globally since JSON only accepts ASCII quotes for structure,
 * and curly quotes in string values should also be converted to ASCII quotes.
 */
export const fixCurlyQuotes: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Count occurrences before replacement to provide diagnostics
    const leftDoubleCount = (sanitized.match(/\u201C/g) ?? []).length;
    const rightDoubleCount = (sanitized.match(/\u201D/g) ?? []).length;
    const leftSingleCount = (sanitized.match(/\u2018/g) ?? []).length;
    const rightSingleCount = (sanitized.match(/\u2019/g) ?? []).length;

    // Replace curly quotes with ASCII equivalents
    // Left double quotation mark (U+201C) -> regular double quote (U+0022)
    sanitized = sanitized.replace(/\u201C/g, '"');

    // Right double quotation mark (U+201D) -> regular double quote (U+0022)
    sanitized = sanitized.replace(/\u201D/g, '"');

    // Left single quotation mark (U+2018) -> regular single quote (U+0027)
    sanitized = sanitized.replace(/\u2018/g, "'");

    // Right single quotation mark (U+2019) -> regular single quote (U+0027)
    sanitized = sanitized.replace(/\u2019/g, "'");

    // Check if any changes were made
    hasChanges = sanitized !== jsonString;

    // Build diagnostics if changes were made
    if (hasChanges) {
      if (leftDoubleCount > 0) {
        diagnostics.push(
          `Converted ${leftDoubleCount} left double curly quote${leftDoubleCount !== 1 ? "s" : ""} (") to regular quote`,
        );
      }
      if (rightDoubleCount > 0) {
        diagnostics.push(
          `Converted ${rightDoubleCount} right double curly quote${rightDoubleCount !== 1 ? "s" : ""} (") to regular quote`,
        );
      }
      if (leftSingleCount > 0) {
        diagnostics.push(
          `Converted ${leftSingleCount} left single curly quote${leftSingleCount !== 1 ? "s" : ""} (') to regular quote`,
        );
      }
      if (rightSingleCount > 0) {
        diagnostics.push(
          `Converted ${rightSingleCount} right single curly quote${rightSingleCount !== 1 ? "s" : ""} (') to regular quote`,
        );
      }
    }

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? SANITIZATION_STEP.FIXED_CURLY_QUOTES : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixCurlyQuotes sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
