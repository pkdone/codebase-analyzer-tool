import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes unescaped quotes inside JSON string values.
 *
 * This sanitizer addresses cases where LLM responses contain unescaped double quotes
 * inside string values (typically in embedded HTML, code snippets, or attribute values),
 * which breaks JSON parsing.
 *
 * Examples of issues this sanitizer handles:
 * - HTML attributes: `"<input type="hidden">"` -> `"<input type=\"hidden\">"`
 * - Multiple attributes: `"<input type="text" name="field">"` -> `"<input type=\"text\" name=\"field\">"`
 * - Code snippets with escaped quotes followed by unescaped quotes: `[\"" + clientId + "\"]` -> `[\\"" + clientId + "\\"]`
 *
 * Strategy:
 * 1. Finds patterns like `="value">` or `="value" ` (followed by >, space+letter, or another quote) and escapes quotes
 * 2. Finds patterns like `\""` (escaped quote followed by unescaped quote) in code snippets and fixes them
 * Only applies to contexts that appear to be inside string values.
 */
export const fixUnescapedQuotesInStrings: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: Find = "value" patterns where the quote should be escaped
    // Matches: = "value" followed by >, space+letter, or another quote (another attribute)
    // This is the most common pattern from error logs: HTML attributes in string values
    const attributeQuotePattern = /(=\s*)"([^"]*)"(\s*[>]|\s+[a-zA-Z]|(?=\s*"))/g;

    sanitized = sanitized.replace(attributeQuotePattern, (match, equalsAndSpace, value, after) => {
      // Check if this appears to be in a string value context
      // Look backwards from the match to see if we're after a colon (value context)
      const matchIndex = sanitized.lastIndexOf(match);
      if (matchIndex === -1) return match;

      const contextBefore = sanitized.substring(Math.max(0, matchIndex - 500), matchIndex);

      // Verify we're in a value context (after a colon, inside a string)
      // Patterns that indicate we're in a string value:
      // - ": "something" ... = "value" (property value with quotes)
      // - ": ... = "value" (property value, might not have quotes if it's a long string)
      // - We're after a colon and before the next property or end of object
      const isInStringValue =
        /:\s*"[^"]*=/.test(contextBefore) || // : "something" ... =
        /:\s*[^"]*=/.test(contextBefore) || // : something ... = (long string value)
        contextBefore.includes('": "') || // property: "value
        contextBefore.includes('":{') || // property: {
        (contextBefore.includes(":") && !/"\s*$/.exec(contextBefore)); // Has colon, not at end of property name

      if (isInStringValue) {
        hasChanges = true;
        const afterStr = typeof after === "string" ? after : "";
        const spacesAfterMatch = /^\s*/.exec(afterStr);
        const spacesAfter = spacesAfterMatch?.[0] ?? "";
        const restAfter = afterStr.substring(spacesAfter.length);
        diagnostics.push(`Escaped quote in HTML attribute: = "${value}"`);
        return `${equalsAndSpace}\\"${value}\\"${spacesAfter}${restAfter}`;
      }
      return match;
    });

    // Pattern 2: Fix escaped quotes followed by unescaped quotes in code snippets
    // This handles cases like: `[\"" + clientId + "\"]` where `\""` should be `\\""`
    // In JSON source: `\""` means escaped quote + unescaped quote (the unescaped quote ends the string!)
    // We need to escape the backslash: `\\""` becomes literal backslash+quote followed by escaped quote
    // The pattern matches: `\"` (backslash+quote) followed immediately by `"` (unescaped quote)
    // Must be followed by something like ` +`, `]`, `,`, whitespace+variable, or end of code snippet
    const escapedQuoteFollowedByUnescapedPattern = /(\\")"(\s*\+|\s*\]|\s*,|(?=\s*[a-zA-Z_$]))/g;

    sanitized = sanitized.replace(
      escapedQuoteFollowedByUnescapedPattern,
      (match, _escapedQuote, after, offset: unknown, string: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const stringStr = typeof string === "string" ? string : sanitized;
        // Check if this appears to be in a string value context
        const contextBefore = stringStr.substring(Math.max(0, numericOffset - 500), numericOffset);

        // Verify we're in a value context (after a colon, inside a string)
        // Look for patterns that indicate we're in a string value containing code snippets
        const isInStringValue =
          /:\s*"[^"]*`/.test(contextBefore) || // : "something `code`
          /:\s*"[^"]*\\/.test(contextBefore) || // : "something with \
          contextBefore.includes('": "') || // property: "value
          (contextBefore.includes(":") && !/"\s*$/.exec(contextBefore)); // Has colon, not at end of property name

        if (isInStringValue) {
          hasChanges = true;
          const afterStr = typeof after === "string" ? after : "";
          diagnostics.push(`Fixed escaped quote followed by unescaped quote: \\"" -> \\\\"\\\\"`);
          // Escape the backslash and the second quote
          // Original: `\"" +` means escaped quote + unescaped quote (closes string prematurely) + (invalid)
          // Fixed: `\\"\\" +` means escaped backslash + escaped quote + escaped quote (all in string) + (valid)
          // In JSON source: `\\"\\"` produces string value containing `\"` + `"`
          return `\\"\\"${afterStr}`;
        }
        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? SANITIZATION_STEP.FIXED_UNESCAPED_QUOTES_IN_STRINGS : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixUnescapedQuotesInStrings sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
