import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../constants/sanitization-steps.config";
import { logSingleLineWarning } from "../../../common/utils/logging";

/**
 * Helper to determine if a position is inside a string literal.
 * This prevents us from modifying property names that appear as values.
 */
function isInStringAt(position: number, content: string): boolean {
  let inString = false;
  let escaped = false;

  for (let i = 0; i < position; i++) {
    const char = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
    } else if (char === '"') {
      inString = !inString;
    }
  }

  return inString;
}

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
export const removeTruncationMarkers: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern 1: Remove standalone truncation marker lines
    // Matches: newline + optional whitespace + truncation marker + optional whitespace + newline
    // Truncation markers: `...`, `[...]`, `(truncated)`, `... (truncated)`, etc.
    // This pattern matches lines that contain only truncation indicators
    // Also handles cases where the marker appears after a comma or before a closing delimiter
    // Additionally, detects when truncation marker appears where a closing delimiter should be
    // Note: The pattern can optionally match a trailing comma + newline before the marker for cases
    // where the truncation marker replaces a closing delimiter (we'll remove the trailing comma)
    const truncationMarkerPattern =
      /(,\s*)?\n(\s*)(\.\.\.|\[\.\.\.\]|\(truncated\)|\.\.\.\s*\(truncated\)|truncated|\.\.\.\s*truncated)(\s*)\n/g;

    sanitized = sanitized.replace(
      truncationMarkerPattern,
      (match, optionalComma, whitespaceBefore, marker, _whitespaceAfter, offset, string) => {
        const markerStr = typeof marker === "string" ? marker : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;
        const wsBefore = typeof whitespaceBefore === "string" ? whitespaceBefore : "";
        const hasTrailingComma = optionalComma !== undefined && optionalComma !== null;

        // Check if this truncation marker appears where a closing delimiter should be
        // Look for context: comma before the marker, and property name after (indicating we're
        // in an array/object that needs to close before the next property starts)
        let needsClosingDelimiter = false;
        let delimiterType: "]" | "}" | null = null;
        let propertyIndent = "";
        if (offsetNum !== undefined && stringStr) {
          // Check what comes before (should be a comma from last array/object element)
          // Use a larger window to ensure we capture the opening delimiter even in large JSON structures
          const beforeMarker = stringStr.substring(Math.max(0, offsetNum - 500), offsetNum);
          const afterMarker = stringStr.substring(
            offsetNum + match.length,
            Math.min(offsetNum + match.length + 100, stringStr.length),
          );

          // Check if we have a comma before and a quoted property name after
          // Pattern: "value",\n...\n  "nextProperty"
          // We check hasTrailingComma from the regex match, or fallback to checking beforeMarker
          const hasCommaBefore = hasTrailingComma || /,\s*\n\s*$/.test(beforeMarker);
          const propertyMatch = /^(\s*)"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/.exec(afterMarker);
          const hasPropertyAfter = propertyMatch !== null;
          propertyIndent = propertyMatch ? propertyMatch[1] || "" : "";

          if (hasCommaBefore && hasPropertyAfter) {
            // We're likely in an array or object that needs to close
            // Determine if we're in an array or object by checking bracket/brace depth
            let bracketDepth = 0;
            let braceDepth = 0;
            let inString = false;
            let escapeNext = false;

            // Scan backwards to find the opening delimiter
            // When scanning backwards: ] increments depth (we're entering an array), [ decrements (we're leaving)
            // We're in an array if we find [ and at that point bracketDepth is 0 or positive
            // (meaning we haven't seen more [ than ] yet, so we're inside this array)
            for (let i = beforeMarker.length - 1; i >= 0; i--) {
              const char = beforeMarker[i];
              if (escapeNext) {
                escapeNext = false;
                continue;
              }
              if (char === "\\") {
                escapeNext = true;
                continue;
              }
              if (char === '"') {
                inString = !inString;
                continue;
              }
              if (!inString) {
                if (char === "]") {
                  bracketDepth++;
                } else if (char === "[") {
                  // Check bracketDepth BEFORE decrementing
                  // If bracketDepth >= 0, we haven't seen more [ than ], so we're in this array
                  if (bracketDepth >= 0 && braceDepth <= 0) {
                    delimiterType = "]";
                    needsClosingDelimiter = true;
                    break;
                  }
                  bracketDepth--;
                } else if (char === "}") {
                  braceDepth++;
                } else if (char === "{") {
                  // Check braceDepth BEFORE decrementing
                  if (braceDepth >= 0 && bracketDepth <= 0) {
                    delimiterType = "}";
                    needsClosingDelimiter = true;
                    break;
                  }
                  braceDepth--;
                }
              }
            }
          }
        }

        hasChanges = true;
        if (needsClosingDelimiter && delimiterType) {
          diagnostics.push(
            `Removed truncation marker and added missing closing ${delimiterType === "]" ? "array" : "object"} delimiter`,
          );
          // Add the closing delimiter with appropriate indentation
          // The trailing comma (if present) is already removed by the regex match
          // (JSON doesn't allow trailing commas in arrays/objects)
          // Use the indentation from the property that comes after (which we extracted earlier)
          const indent = propertyIndent || (wsBefore.length >= 2 ? wsBefore.substring(2) : "");
          // Return the closing delimiter with comma for the next property
          return `\n${indent}${delimiterType},\n`;
        } else {
          diagnostics.push(`Removed truncation marker: "${markerStr.trim()}"`);
          // If we matched a trailing comma, preserve it (the comma is valid if there's already a closing delimiter)
          // Otherwise, replace with just the newlines
          if (hasTrailingComma) {
            return `,\n\n`;
          }
          return "\n\n";
        }
      },
    );

    // Pattern 2: Handle incomplete strings before closing delimiters
    // Matches: incomplete string (missing closing quote) followed by truncation marker and closing delimiter
    // Example: `"incomplete string...\n]` -> `"incomplete string",\n]`
    // This handles cases where the string itself was truncated, not just a marker line added
    const incompleteStringPattern =
      /"([^"]*?)(\.\.\.|\[\.\.\.\]|\(truncated\))(\s*)\n(\s*)([}\]])/g;

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
    const truncationBeforeDelimiterPattern =
      /("\s*,\s*|\n)(\s*)(\.\.\.|\[\.\.\.\]|\(truncated\))(\s*)\n(\s*)([}\]])/g;

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

    // Pattern 4: Handle truncation markers with explanatory text (e.g., `secho "I have truncated..."`)
    // Matches: text followed by truncation explanation before closing delimiters or property names
    const explanatoryTruncationPattern =
      /([}\]])\s*,\s*\n\s*([a-z]{1,10})\s*"([^"]*truncat[^"]*)"\s*\n\s*([}\]])/gi;
    sanitized = sanitized.replace(
      explanatoryTruncationPattern,
      (match, delimiter, _strayText, explanation, nextDelimiter, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const nextDelimiterStr = typeof nextDelimiter === "string" ? nextDelimiter : "";
        const explanationStr = typeof explanation === "string" ? explanation : "";

        if (/truncat/i.test(explanationStr)) {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed explanatory truncation text: "${explanationStr.substring(0, 50)}..."`,
            );
          }
          return `${delimiterStr},\n    ${nextDelimiterStr}`;
        }

        return match;
      },
    );

    // Pattern 5: Handle _TRUNCATED_ markers and similar truncation markers
    // Matches: `_TRUNCATED_`, `_INPUT_TOKEN_COUNT_`, `_DOC_GENERATION_TRUNCATED_`, etc.
    // These markers can appear at the end of JSON or in the middle
    // Also handles cases like: `"parameters": [],\n_TRUNCATED_\n}`
    const underscoreTruncatedPattern =
      /([}\],]|\n|^)(\s*)(_TRUNCATED_|_INPUT_TOKEN_COUNT_|_DOC_GENERATION_TRUNCATED_)(\s*)([}\],]|\n|$)/gi;
    sanitized = sanitized.replace(
      underscoreTruncatedPattern,
      (match, before, _whitespace, marker, _whitespace2, after, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const beforeStr = typeof before === "string" ? before : "";
        const afterStr = typeof after === "string" ? after : "";
        const markerStr = typeof marker === "string" ? marker : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Removed truncation marker: ${markerStr}`);
        }

        // If there's a comma before, keep it; otherwise just return the delimiters
        if (beforeStr.includes(",")) {
          return `${beforeStr}\n${afterStr}`;
        }
        return `${beforeStr}${afterStr}`;
      },
    );

    // Pattern 5b: Handle _TRUNCATED_ markers that appear after property values
    // Matches: `"parameters": [],\n_TRUNCATED_\n}` or `"parameters": []\n_TRUNCATED_\n}`
    // Also handles: `],\n_TRUNCATED_\n}` (with comma after delimiter)
    const truncatedAfterPropertyPattern =
      /([}\],]|")(\s*,?\s*)\n(\s*)(_TRUNCATED_|_INPUT_TOKEN_COUNT_|_DOC_GENERATION_TRUNCATED_)(\s*)\n(\s*)([}])/gi;
    sanitized = sanitized.replace(
      truncatedAfterPropertyPattern,
      (
        match,
        before,
        _commaAndWhitespace,
        _whitespace1,
        marker,
        _whitespace2,
        whitespace3,
        closingBrace,
        offset: unknown,
      ) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const beforeStr = typeof before === "string" ? before : "";
        const markerStr = typeof marker === "string" ? marker : "";
        const ws3 = typeof whitespace3 === "string" ? whitespace3 : "";
        const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Removed truncation marker ${markerStr} before closing brace`);
        }

        // Return the property value, newline, and closing brace
        // Remove trailing comma if present (JSON doesn't allow trailing commas before closing brace)
        // The commaAndWhitespace group contains the comma and whitespace, which we remove completely
        return `${beforeStr}\n${ws3}${closingBraceStr}`;
      },
    );

    // Pattern 6: Handle truncation text in arrays (e.g., `secho "I have truncated the response..."`)
    // This pattern handles cases where truncation text appears as an array element
    const truncationTextInArrayPattern = /([[\s,]\s*)([a-z]{1,10})\s*"([^"]*truncat[^"]*)"\s*,/gi;
    sanitized = sanitized.replace(
      truncationTextInArrayPattern,
      (match, prefix, _strayText, truncationText, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        let bracketDepth = 0;
        let braceDepth = 0;
        let inString = false;
        let escape = false;
        for (let i = beforeMatch.length - 1; i >= 0; i--) {
          const char = beforeMatch[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (char === "\\") {
            escape = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === "]") {
              bracketDepth++;
            } else if (char === "[") {
              bracketDepth--;
              if (bracketDepth >= 0 && braceDepth <= 0) {
                // We're in an array context, remove this truncation text
                hasChanges = true;
                const prefixStr = typeof prefix === "string" ? prefix : "";
                const truncationTextStr = typeof truncationText === "string" ? truncationText : "";
                if (diagnostics.length < 10) {
                  diagnostics.push(
                    `Removed truncation text from array: "${truncationTextStr.substring(0, 50)}..."`,
                  );
                }
                // Remove the element entirely (including the comma)
                return prefixStr;
              }
            } else if (char === "}") {
              braceDepth++;
            } else if (char === "{") {
              braceDepth--;
            }
          }
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? SANITIZATION_STEP.REMOVED_TRUNCATION_MARKERS : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    logSingleLineWarning(`removeTruncationMarkers sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
