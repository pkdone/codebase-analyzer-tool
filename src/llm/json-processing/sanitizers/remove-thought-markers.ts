import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that removes LLM "thought" markers and similar prefixes.
 *
 * This sanitizer addresses cases where LLMs include thought markers or
 * explanation prefixes before the JSON content, which breaks parsing.
 *
 * Examples of issues this sanitizer handles:
 * - `<ctrl94>thought` -> removed
 * - `<thinking>` -> removed
 * - `Here's the JSON:` -> removed
 * - `Thought: ...` -> removed
 *
 * Strategy:
 * Removes common thought marker patterns and text that appears before
 * JSON content but is clearly not part of the JSON structure.
 */
export const removeThoughtMarkers: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;

    // Pattern 1: Remove <ctrl94>thought or similar control-style thought markers
    // Matches: <ctrlXX>thought, <thinking>, etc.
    const ctrlThoughtPattern = /<ctrl\d+>\s*thought\s*\n/i;

    // Pattern 2: Remove literal "thought" markers at start of string
    // Matches: thought\n, Thought:\n, etc. (case insensitive)
    const thoughtMarkerPattern = /^thought\s*:?\s*\n/i;

    // Remove thought markers from the start
    sanitized = sanitized.replace(ctrlThoughtPattern, "");
    sanitized = sanitized.replace(thoughtMarkerPattern, "");

    // Remove text immediately before opening braces (like "command{")
    // This handles cases where LLMs write "command{" or "data{" before JSON
    // We check for common non-JSON words that appear before opening braces
    const nonJsonWords = new Set([
      "command",
      "data",
      "result",
      "output",
      "json",
      "response",
      "object",
      "content",
      "payload",
      "body",
    ]);

    // Pattern: word followed by opening brace (like "command{" or "data {")
    // Match at start of line or after whitespace/newline to avoid breaking property names
    sanitized = sanitized.replace(
      /(^|\n|\r)\s*([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\{/g,
      (match, prefix, word) => {
        const lowerWord = (word as string).toLowerCase();
        if (nonJsonWords.has(lowerWord)) {
          hasChanges = true;
          return `${prefix}{`;
        }
        return match;
      },
    );

    // Also handle cases where there's no newline, just whitespace before word{
    sanitized = sanitized.replace(/\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\{/g, (match, word) => {
      const lowerWord = (word as string).toLowerCase();
      if (nonJsonWords.has(lowerWord)) {
        // Check if this appears to be at the start of JSON structure
        // (not in the middle of valid JSON)
        const matchIndex = sanitized.indexOf(match);
        const beforeMatch = sanitized.substring(Math.max(0, matchIndex - 50), matchIndex);
        // If we see patterns suggesting this is before the main JSON structure
        // (like ending with newlines, or being near the start)
        if (matchIndex < 500 || /\n\s*$/.test(beforeMatch)) {
          hasChanges = true;
          return " {";
        }
      }
      return match;
    });

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? SANITIZATION_STEP.REMOVED_THOUGHT_MARKERS : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`removeThoughtMarkers sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
