import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that removes truncation markers (like `...`) that LLMs sometimes add
 * when their responses are cut off. These markers are not valid JSON and break parsing.
 *
 * This sanitizer handles:
 * 1. Lines containing only truncation markers (e.g., `...`, `[...]`, `(truncated)`)
 * 2. Truncation markers that appear before closing delimiters (], })
 * 3. Incomplete array entries (truncated strings missing closing quote) followed by truncation markers
 *
 * Examples:
 * - `"item",\n...\n]` -> `"item",\n]` (removes the truncation marker line)
 * - `"incomplete str...\n]` -> `"incomplete str",\n]` (completes truncated string and removes marker)
 *
 * Strategy:
 * 1. First pass: Remove standalone truncation marker lines
 * 2. Second pass: Handle truncated strings at the end of arrays/objects before closing delimiters
 */
export const removeTruncationMarkers: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern 1: Remove standalone truncation marker lines
    // Matches: newline + optional whitespace + truncation marker + optional whitespace + newline
    // Truncation markers: `...`, `[...]`, `(truncated)`, `... (truncated)`, etc.
    // This pattern matches lines that contain only truncation indicators
    // Also handles cases where the marker appears after a comma or before a closing delimiter
    const truncationMarkerPattern = /\n(\s*)(\.\.\.|\[\.\.\.\]|\(truncated\)|\.\.\.\s*\(truncated\)|truncated|\.\.\.\s*truncated)(\s*)\n/g;

    sanitized = sanitized.replace(
      truncationMarkerPattern,
      (_match, _whitespaceBefore, marker, _whitespaceAfter) => {
        hasChanges = true;
        const markerStr = typeof marker === "string" ? marker : "";
        diagnostics.push(`Removed truncation marker: "${markerStr.trim()}"`);
        // Replace with just the newlines (preserving structure)
        return "\n\n";
      },
    );

    // Pattern 2: Handle incomplete strings before closing delimiters
    // Matches: incomplete string (missing closing quote) followed by truncation marker and closing delimiter
    // Example: `"incomplete string...\n]` -> `"incomplete string",\n]`
    // This handles cases where the string itself was truncated, not just a marker line added
    const incompleteStringPattern = /"([^"]*?)(\.\.\.|\[\.\.\.\]|\(truncated\))(\s*)\n(\s*)([}\]])/g;

    sanitized = sanitized.replace(
      incompleteStringPattern,
      (_match, stringContent, _marker, _whitespace1, whitespace2, delimiter) => {
        const contentStr = typeof stringContent === "string" ? stringContent : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const ws2 = typeof whitespace2 === "string" ? whitespace2 : "";

        hasChanges = true;
        diagnostics.push(
          `Fixed incomplete string before ${delimiterStr === "]" ? "array" : "object"} closure`,
        );

        // Close the string properly and add comma if needed (for arrays)
        // If the delimiter is ], we likely need a comma before it if there are other items
        // But since we're at the end, we can just close the string and the delimiter
        return `"${contentStr}"${delimiterStr === "]" ? "," : ""}${ws2}${delimiterStr}`;
      },
    );

    // Pattern 3: Handle truncation markers right before closing delimiters (after string value)
    // Matches: `"value",\n...\n]` or `"value"\n...\n]` - truncation marker line before closing delimiter
    // Also handles: `...\n]` when the marker appears at the start of a line before the delimiter
    const truncationBeforeDelimiterPattern = /("\s*,\s*|\n)(\s*)(\.\.\.|\[\.\.\.\]|\(truncated\))(\s*)\n(\s*)([}\]])/g;

    sanitized = sanitized.replace(
      truncationBeforeDelimiterPattern,
      (_match, beforeMarker, _whitespace1, _marker, _whitespace2, whitespace3, delimiter) => {
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const ws3 = typeof whitespace3 === "string" ? whitespace3 : "";
        const beforeStr = typeof beforeMarker === "string" ? beforeMarker : "";

        hasChanges = true;
        diagnostics.push(
          `Removed truncation marker before ${delimiterStr === "]" ? "array" : "object"} closure`,
        );

        // Remove the truncation marker, preserve what comes before (comma or newline)
        // If beforeMarker is a comma, keep it; otherwise it's a newline which we keep
        if (beforeStr.includes(",")) {
          return `${beforeStr}\n${ws3}${delimiterStr}`;
        }
        return `\n${ws3}${delimiterStr}`;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? SANITIZATION_STEP.REMOVED_TRUNCATION_MARKERS
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`removeTruncationMarkers sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

