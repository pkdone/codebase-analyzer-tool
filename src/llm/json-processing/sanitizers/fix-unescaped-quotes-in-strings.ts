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
 *
 * Strategy:
 * Uses regex to find patterns like `="value">` or `="value" ` (followed by space+letter)
 * and escapes the quotes. Only applies to contexts that appear to be inside string values.
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
        /:\s*"[^"]*=/.test(contextBefore) ||  // : "something" ... = 
        /:\s*[^"]*=/.test(contextBefore) ||    // : something ... = (long string value)
        contextBefore.includes('": "') ||       // property: "value
        contextBefore.includes('":{') ||        // property: {
        (contextBefore.includes(':') && !/"\s*$/.exec(contextBefore)); // Has colon, not at end of property name

      if (isInStringValue) {
        hasChanges = true;
        const afterStr = typeof after === 'string' ? after : '';
        const spacesAfterMatch = /^\s*/.exec(afterStr);
        const spacesAfter = spacesAfterMatch?.[0] ?? '';
        const restAfter = afterStr.substring(spacesAfter.length);
        diagnostics.push(`Escaped quote in HTML attribute: = "${value}"`);
        return `${equalsAndSpace}\\"${value}\\"${spacesAfter}${restAfter}`;
      }
      return match;
    });

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
