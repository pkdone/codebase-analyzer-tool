import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../constants/sanitization-steps.config";

/**
 * Sanitizer that completes truncated JSON structures by adding missing closing delimiters.
 *
 * LLMs sometimes generate truncated JSON responses that are missing closing braces
 * or brackets. This sanitizer detects and completes these structures.
 *
 * ## Examples
 * - `{"key": "value"` -> `{"key": "value"}`
 * - `[1, 2, 3` -> `[1, 2, 3]`
 * - `{"outer": {"inner": "value"` -> `{"outer": {"inner": "value"}}`
 * - `"incomplete string` -> `"incomplete string"`
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with truncated structures completed
 */
export const completeTruncatedStructures: Sanitizer = (input: string): SanitizerResult => {
  const trimmed = input.trim();
  if (!trimmed) {
    return { content: input, changed: false };
  }

  // Early exit if already properly closed
  if (trimmed.endsWith("}") || trimmed.endsWith("]")) {
    return { content: input, changed: false };
  }

  // Build delimiter stack to determine what needs to be closed
  const completionStack: string[] = [];
  let inString = false;
  let escapeNext = false;

  for (const ch of trimmed) {
    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (ch === "\\") {
      escapeNext = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (!inString) {
      if (ch === "{" || ch === "[") {
        completionStack.push(ch);
      } else if (ch === "}" || ch === "]") {
        completionStack.pop();
      }
    }
  }

  // If we're still in a string, close it first
  let finalContent = trimmed;
  if (inString) {
    finalContent += '"';
  }

  // Add missing closing delimiters
  const addedDelimiters: string[] = [];
  while (completionStack.length) {
    const opener = completionStack.pop();
    if (opener === "{") {
      finalContent += "}";
      addedDelimiters.push("}");
    } else if (opener === "[") {
      finalContent += "]";
      addedDelimiters.push("]");
    }
  }

  if (addedDelimiters.length > 0 || inString) {
    return {
      content: finalContent,
      changed: true,
      description: SANITIZATION_STEP.COMPLETED_TRUNCATED_STRUCTURES,
      diagnostics: [
        SANITIZATION_STEP.COMPLETED_TRUNCATED_STRUCTURES,
        `Added ${addedDelimiters.length} closing delimiter${addedDelimiters.length !== 1 ? "s" : ""}${inString ? " and closed incomplete string" : ""}`,
      ],
    };
  }

  return { content: input, changed: false };
};
