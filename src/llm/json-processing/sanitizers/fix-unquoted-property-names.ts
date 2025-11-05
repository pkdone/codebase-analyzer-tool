import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { DELIMITERS } from "../config/json-processing.config";

/**
 * Sanitizer that fixes unquoted property names in JSON responses.
 *
 * This sanitizer addresses cases where LLM responses contain property names
 * without double quotes, which is invalid JSON syntax. For example:
 * - Invalid: {name: "value", unquotedProp: "value"}
 * - Fixed: {"name": "value", "unquotedProp": "value"}
 *
 * It also handles property names with missing opening quotes:
 * - Invalid: {description": "value"}
 * - Fixed: {"description": "value"}
 *
 * It also handles property names with missing closing quote and colon:
 * - Invalid: {"name "value"}
 * - Fixed: {"name": "value"}
 *
 * The sanitizer is state-aware and tracks whether it's inside a string literal
 * to avoid corrupting valid JSON content within strings.
 */
export const fixUnquotedPropertyNames: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    // Helper to determine if a position is inside a string literal
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

    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // First pass: Fix property names with missing opening quotes (e.g., description":)
    // This pattern matches: propertyName": (where opening quote is missing)
    // We need to run this in a loop because after fixing one, positions may shift
    let previousSanitized = "";
    while (previousSanitized !== sanitized) {
      previousSanitized = sanitized;
      const missingOpeningQuotePattern = /(\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)"\s*:/g;

      sanitized = sanitized.replace(
        missingOpeningQuotePattern,
        (match, whitespace, propertyName, offset: unknown) => {
          const numericOffset = typeof offset === "number" ? offset : 0;
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

          // Calculate the position where the property name actually starts (after whitespace)
          const propertyNameStart = numericOffset + whitespaceStr.length;

          // Check if there's already an opening quote before the property name
          if (
            propertyNameStart > 0 &&
            sanitized[propertyNameStart - 1] === DELIMITERS.DOUBLE_QUOTE
          ) {
            return match; // Keep as is - already properly quoted
          }

          // Additional check: verify we're at a property boundary by looking for
          // valid delimiters before the whitespace (], }, or comma with optional whitespace/newline)
          // This helps avoid false matches inside string values
          // We check for delimiters in a larger window to catch cases after long string values
          let isAfterPropertyBoundary = false;
          if (numericOffset > 0) {
            // Check in a larger window (up to 50 chars) to catch delimiters after long strings
            const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
            // If we're right after a closing delimiter (], }, or ,), we're at a property boundary
            // This includes cases like: "long string",\n      propertyName": where the comma might be
            // many characters before due to the long string
            isAfterPropertyBoundary = /[}\],]\s*$/.test(beforeMatch);
          }

          // Check if we're inside a string literal at the property name position
          // BUT: if we're clearly after a property boundary (comma, closing brace/bracket),
          // we should trust the boundary check over the string check, as the boundary
          // indicates we've exited the previous string value
          if (!isAfterPropertyBoundary && isInStringAt(propertyNameStart, sanitized)) {
            return match; // Keep as is - inside a string and not at a clear boundary
          }

          // If we're not after a boundary and not at start of string, be more cautious
          if (!isAfterPropertyBoundary && numericOffset > 10) {
            // Check if the context before suggests we might be in a string
            // by counting quotes in a larger window
            const largerContext = sanitized.substring(
              Math.max(0, numericOffset - 200),
              numericOffset,
            );
            let quoteCount = 0;
            let escape = false;
            for (const char of largerContext) {
              if (escape) {
                escape = false;
                continue;
              }
              if (char === "\\") {
                escape = true;
              } else if (char === '"') {
                quoteCount++;
              }
            }
            // If odd number of quotes and we don't have a clear boundary, we might be in a string
            // However, if whitespace includes a newline, it's likely a new property after a string
            if (quoteCount % 2 === 1 && !whitespaceStr.includes("\n")) {
              return match;
            }
          }

          hasChanges = true;
          diagnostics.push(`Fixed property name with missing opening quote: ${propertyNameStr}"`);
          return `${whitespaceStr}"${propertyNameStr}":`;
        },
      );
    }

    // Third pass: Fix property names with missing closing quote and colon
    // This pattern matches: "propertyName "value" (where closing quote and colon are missing)
    // Example: "name "command" should become "name": "command"
    // We need to run this in a loop because after fixing one, positions may shift
    let previousSanitizedThirdPass = "";
    while (previousSanitizedThirdPass !== sanitized) {
      previousSanitizedThirdPass = sanitized;
      // Pattern matches property name with opening quote, followed by one or more spaces, then a quote (value's opening quote)
      const missingClosingQuoteAndColonPattern = /"([a-zA-Z_$][a-zA-Z0-9_$.-]*)\s+"([^"]+)"/g;

      sanitized = sanitized.replace(
        missingClosingQuoteAndColonPattern,
        (match, propertyName, value, offset: unknown) => {
          const numericOffset = typeof offset === "number" ? offset : 0;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";

          // Check if we're inside a string literal at the property name position
          // (check at the position of the opening quote)
          if (isInStringAt(numericOffset, sanitized)) {
            return match; // Keep as is - inside a string
          }

          // Check if there's proper context before this match - we should be at a property boundary
          // This helps avoid false matches inside string values
          if (numericOffset > 0) {
            const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
            // Check if we're after a valid delimiter (property boundary)
            // Pattern matches: ], }, [, or , followed by optional whitespace/newlines
            // We check for delimiters followed by whitespace, which could include newlines
            const isAfterPropertyBoundary = /[}\],][\s\n]*$/.test(beforeMatch);

            // If not at a clear boundary, check quote count to see if we might be in a string
            if (!isAfterPropertyBoundary && numericOffset > 20) {
              const largerContext = sanitized.substring(
                Math.max(0, numericOffset - 200),
                numericOffset,
              );
              let quoteCount = 0;
              let escape = false;
              for (const char of largerContext) {
                if (escape) {
                  escape = false;
                  continue;
                }
                if (char === "\\") {
                  escape = true;
                } else if (char === '"') {
                  quoteCount++;
                }
              }
              // If odd number of quotes, we're inside a string - skip
              if (quoteCount % 2 === 1) {
                return match;
              }
            }
          }

          hasChanges = true;
          diagnostics.push(
            `Fixed property name with missing closing quote and colon: "${propertyNameStr} " -> "${propertyNameStr}":`,
          );
          return `"${propertyNameStr}": "${valueStr}"`;
        },
      );
    }

    // Second pass: Fix completely unquoted property names (e.g., name:)
    // This pattern matches property names that are completely unquoted
    // We add additional context checking to ensure we're at a property boundary
    const unquotedPropertyPattern = /(\s*)([a-zA-Z_$][a-zA-Z0-9_$.-]*)\s*:/g;

    sanitized = sanitized.replace(
      unquotedPropertyPattern,
      (match, whitespace, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

        // Check if already quoted (now checking sanitized string)
        if (numericOffset > 0 && sanitized[numericOffset - 1] === DELIMITERS.DOUBLE_QUOTE) {
          return match; // Keep as is
        }

        // Check if we're inside a string literal
        if (isInStringAt(numericOffset, sanitized)) {
          return match; // Keep as is - inside a string
        }

        // Additional context check: verify we're at a property boundary
        // This helps avoid false matches in other contexts
        if (numericOffset > 0) {
          const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
          // Check if we're after a valid property boundary: {, }, ], ,, or newline
          // This ensures we're in an object context, not somewhere else
          const isAfterPropertyBoundary = /[{}\],]\s*$|\n\s*$/.test(beforeMatch);
          
          // If we're not at a clear boundary, be more cautious
          // Check if the character immediately before the whitespace is a valid delimiter
          const charBeforeWhitespace = numericOffset > 0 ? sanitized[numericOffset - 1] : "";
          const isValidContext = 
            isAfterPropertyBoundary || 
            charBeforeWhitespace === "{" || 
            charBeforeWhitespace === "," ||
            charBeforeWhitespace === "\n" ||
            numericOffset === 0;

          if (!isValidContext) {
            // Additional check: count quotes to see if we might be in a string
            let quoteCount = 0;
            let escape = false;
            for (let i = Math.max(0, numericOffset - 200); i < numericOffset; i++) {
              const char = sanitized[i];
              if (escape) {
                escape = false;
                continue;
              }
              if (char === "\\") {
                escape = true;
              } else if (char === '"') {
                quoteCount++;
              }
            }
            // If odd number of quotes, we're likely inside a string - skip
            if (quoteCount % 2 === 1) {
              return match;
            }
          }
        }

        hasChanges = true;
        diagnostics.push(`Fixed unquoted property name: ${propertyNameStr}`);
        return `${whitespaceStr}"${propertyNameStr}":`;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? "Fixed unquoted property names" : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixUnquotedPropertyNames sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
