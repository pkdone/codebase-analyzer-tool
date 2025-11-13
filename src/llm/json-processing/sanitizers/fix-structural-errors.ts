import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import {
  SANITIZATION_STEP,
  SANITIZATION_STEP_TEMPLATE,
} from "../constants/sanitization-steps.config";
import { DELIMITERS } from "../constants/json-processing.config";

/**
 * Helper to check if we're in an array context by scanning backwards.
 */
function isInArrayContext(matchIndex: number, content: string): boolean {
  const beforeMatch = content.substring(Math.max(0, matchIndex - 500), matchIndex);

  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escapeNext = false;
  let foundOpeningBracket = false;

  // Scan backwards to find context
  for (let i = beforeMatch.length - 1; i >= 0; i--) {
    const char = beforeMatch[i];
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
      if (char === "{") {
        openBraces++;
        if (openBraces === 0 && openBrackets > 0 && foundOpeningBracket) {
          break;
        }
      } else if (char === "}") {
        openBraces--;
      } else if (char === "[") {
        openBrackets++;
        foundOpeningBracket = true;
      } else if (char === "]") {
        openBrackets--;
      }
    }
  }

  return foundOpeningBracket && openBrackets > 0;
}

/**
 * Consolidated sanitizer that fixes fundamental JSON structural issues.
 *
 * This sanitizer combines the functionality of:
 * 1. add-missing-commas: Insert missing commas between properties
 * 2. remove-trailing-commas: Remove trailing commas before closing delimiters
 * 3. fix-mismatched-delimiters: Fix bracket/brace mismatches
 * 4. complete-truncated-structures: Close unclosed brackets/braces
 * 5. fix-missing-array-object-braces: Insert missing opening braces for array objects
 *
 * ## Purpose
 * LLMs sometimes generate JSON with structural issues like missing commas, mismatched
 * delimiters, or truncated structures. This sanitizer fixes all of these in a single
 * stateful pass for efficiency.
 *
 * ## Implementation
 * Uses a stateful, character-by-character parser that:
 * - Tracks string boundaries (respects escaped quotes)
 * - Maintains delimiter stack for `{` and `[`
 * - Detects and fixes missing commas, trailing commas, mismatched delimiters
 * - Completes truncated structures at the end
 * - Fixes missing array object braces using regex patterns
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with structural errors fixed
 */
export const fixStructuralErrors: Sanitizer = (input: string): SanitizerResult => {
  try {
    const trimmed = input.trim();
    if (!trimmed) {
      return { content: input, changed: false };
    }

    let sanitized = trimmed;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Step 1: Remove trailing commas (simplest, do first)
    const trailingCommaPattern = /,\s*([}\]])/g;
    const beforeTrailingCommas = sanitized;
    sanitized = sanitized.replaceAll(trailingCommaPattern, "$1");
    if (sanitized !== beforeTrailingCommas) {
      hasChanges = true;
      diagnostics.push(SANITIZATION_STEP.REMOVED_TRAILING_COMMAS);
    }

    // Step 2: Fix missing commas between properties
    // Pattern: Match a value terminator (quote, closing brace, bracket, or digit) followed by newline and whitespace,
    // then a quoted property name. This indicates a missing comma between properties on separate lines.
    const missingCommaPattern = /(["}\]\]]|\d)\s*\n(\s*")([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    let commaCount = 0;

    sanitized = sanitized.replace(
      missingCommaPattern,
      (match, terminator, quote2WithWhitespace, propertyName, offset) => {
        const offsetNum = typeof offset === "number" ? offset : 0;
        const terminatorStr = typeof terminator === "string" ? terminator : "";
        const quote2WithWhitespaceStr =
          typeof quote2WithWhitespace === "string" ? quote2WithWhitespace : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

        // Verify we're not in a string by checking context (only if terminator is a quote)
        if (terminatorStr === '"') {
          // Count quotes up to and including the terminator
          let quoteCount = 0;
          let escaped = false;
          for (let i = 0; i <= offsetNum; i++) {
            if (escaped) {
              escaped = false;
              continue;
            }
            if (sanitized[i] === "\\") {
              escaped = true;
            } else if (sanitized[i] === '"') {
              quoteCount++;
            }
          }

          // If odd number of quotes (including the terminator), we're in a string, skip
          if (quoteCount % 2 === 1) {
            return match;
          }
        }

        // Check if there's already a comma before the newline
        const beforeNewline = sanitized.substring(Math.max(0, offsetNum - 10), offsetNum);
        if (beforeNewline.trim().endsWith(",")) {
          return match;
        }

        // Check if this looks like a property context
        if (offsetNum < 5) {
          // Too close to start - might be edge case, skip
          return match;
        }

        commaCount++;
        return `${terminatorStr},\n${quote2WithWhitespaceStr}${propertyNameStr}":`;
      },
    );

    // Handle missing commas in arrays
    const missingCommaInArrayPattern = /(["}\]\]])\s*\n(\s*)(["{])/g;
    sanitized = sanitized.replace(
      missingCommaInArrayPattern,
      (match, terminator, whitespace, nextElement, offset) => {
        const offsetNum = typeof offset === "number" ? offset : 0;
        const terminatorStr = typeof terminator === "string" ? terminator : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const nextElementStr = typeof nextElement === "string" ? nextElement : "";

        // Check if we're in an array context (not in a string)
        let inString = false;
        let escaped = false;
        for (let i = 0; i < offsetNum; i++) {
          if (escaped) {
            escaped = false;
            continue;
          }
          if (sanitized[i] === "\\") {
            escaped = true;
          } else if (sanitized[i] === '"') {
            inString = !inString;
          }
        }

        if (inString) {
          return match;
        }

        // Check if we're actually in an array (have opening bracket before)
        const beforeMatch = sanitized.substring(Math.max(0, offsetNum - 500), offsetNum);
        let bracketDepth = 0;
        let braceDepth = 0;
        let inStringCheck = false;
        let escapeCheck = false;
        let foundArray = false;

        for (let i = beforeMatch.length - 1; i >= 0; i--) {
          const char = beforeMatch[i];
          if (escapeCheck) {
            escapeCheck = false;
            continue;
          }
          if (char === "\\") {
            escapeCheck = true;
            continue;
          }
          if (char === '"') {
            inStringCheck = !inStringCheck;
            continue;
          }
          if (!inStringCheck) {
            if (char === "]") {
              bracketDepth++;
            } else if (char === "[") {
              bracketDepth--;
              if (bracketDepth >= 0 && braceDepth <= 0) {
                foundArray = true;
                break;
              }
            } else if (char === "}") {
              braceDepth++;
            } else if (char === "{") {
              braceDepth--;
            }
          }
        }

        if (!foundArray) {
          return match;
        }

        // Check if there's already a comma before the newline
        const beforeNewline = sanitized.substring(Math.max(0, offsetNum - 10), offsetNum);
        if (beforeNewline.trim().endsWith(",")) {
          return match;
        }

        commaCount++;
        return `${terminatorStr},\n${whitespaceStr}${nextElementStr}`;
      },
    );

    if (commaCount > 0) {
      hasChanges = true;
      diagnostics.push(SANITIZATION_STEP_TEMPLATE.addedMissingCommas(commaCount));
    }

    // Step 3: Fix mismatched delimiters using stateful parser
    const chars = Array.from(sanitized);
    const result: string[] = [];
    let i = 0;

    // State tracking
    let inString = false;
    let escapeNext = false;
    const delimiterStack: { opener: string; index: number }[] = [];
    const delimiterCorrections: {
      index: number;
      wrongChar: string;
      correctChar: string;
      insertAfter?: string;
    }[] = [];

    // Helper to peek at next non-whitespace, non-comma character
    const peekNextNonWhitespace = (startIdx: number): string | null => {
      const remaining = sanitized.substring(startIdx + 1);
      const regex = /[^\s,]/;
      const match = regex.exec(remaining);
      return match ? match[0] : null;
    };

    // First pass: identify mismatched delimiters
    while (i < chars.length) {
      const char = chars[i];

      if (escapeNext) {
        escapeNext = false;
        result.push(char);
        i++;
        continue;
      }

      if (char === DELIMITERS.BACKSLASH) {
        escapeNext = true;
        result.push(char);
        i++;
        continue;
      }

      if (char === DELIMITERS.DOUBLE_QUOTE) {
        inString = !inString;
        result.push(char);
        i++;
        continue;
      }

      if (inString) {
        result.push(char);
        i++;
        continue;
      }

      // Outside string: handle structural elements
      if (char === DELIMITERS.OPEN_BRACE || char === DELIMITERS.OPEN_BRACKET) {
        delimiterStack.push({ opener: char, index: result.length });
        result.push(char);
        i++;
        continue;
      }

      if (char === DELIMITERS.CLOSE_BRACE || char === DELIMITERS.CLOSE_BRACKET) {
        if (delimiterStack.length > 0) {
          const top = delimiterStack.pop();
          if (top) {
            const { opener } = top;
            const expectedCloser =
              opener === DELIMITERS.OPEN_BRACE ? DELIMITERS.CLOSE_BRACE : DELIMITERS.CLOSE_BRACKET;

            if (char !== expectedCloser) {
              // Mismatched delimiter - track for correction
              // Special case: We see ] but expected }, AND there's a [ on the stack
              // This means we need to close the object first, then the array
              if (
                char === DELIMITERS.CLOSE_BRACKET &&
                expectedCloser === DELIMITERS.CLOSE_BRACE &&
                delimiterStack.length >= 1 &&
                delimiterStack[delimiterStack.length - 1].opener === DELIMITERS.OPEN_BRACKET
              ) {
                // We need to close the object with }, then close the array with ]
                // Check if there's more content after this delimiter that suggests we need both
                const nextChar = peekNextNonWhitespace(i);
                // Only insert both if next char is comma (indicating more properties/elements)
                // or quote (indicating a property name follows)
                if (nextChar === "," || nextChar === DELIMITERS.DOUBLE_QUOTE) {
                  delimiterCorrections.push({
                    index: result.length,
                    wrongChar: char,
                    correctChar: DELIMITERS.CLOSE_BRACE,
                    insertAfter: DELIMITERS.CLOSE_BRACKET,
                  });
                  delimiterStack.pop(); // Pop the array opener since we'll close it
                } else {
                  delimiterCorrections.push({
                    index: result.length,
                    wrongChar: char,
                    correctChar: expectedCloser,
                  });
                }
              } else {
                delimiterCorrections.push({
                  index: result.length,
                  wrongChar: char,
                  correctChar: expectedCloser,
                });
              }
              result.push(char); // Push wrong delimiter, will be corrected later
            } else {
              result.push(char);
            }
          }
        } else {
          result.push(char);
        }
        i++;
        continue;
      }

      result.push(char);
      i++;
    }

    // Apply delimiter corrections (from end to start to maintain indices)
    let workingContent = result.join("");
    if (delimiterCorrections.length > 0) {
      hasChanges = true;
      for (let idx = delimiterCorrections.length - 1; idx >= 0; idx--) {
        const { index, correctChar, insertAfter } = delimiterCorrections[idx];
        if (insertAfter) {
          workingContent =
            workingContent.substring(0, index) +
            correctChar +
            insertAfter +
            workingContent.substring(index + 1);
        } else {
          workingContent =
            workingContent.substring(0, index) + correctChar + workingContent.substring(index + 1);
        }
      }
      diagnostics.push(
        SANITIZATION_STEP_TEMPLATE.fixedMismatchedDelimiters(delimiterCorrections.length),
      );
    }

    sanitized = workingContent;

    // Step 4: Complete truncated structures
    // Build delimiter stack to determine what needs to be closed
    const completionStack: string[] = [];
    let inStringFinal = false;
    let escapeNextFinal = false;

    for (const ch of sanitized) {
      if (escapeNextFinal) {
        escapeNextFinal = false;
        continue;
      }

      if (ch === "\\") {
        escapeNextFinal = true;
        continue;
      }

      if (ch === '"') {
        inStringFinal = !inStringFinal;
        continue;
      }

      if (!inStringFinal) {
        if (ch === "{" || ch === "[") {
          completionStack.push(ch);
        } else if (ch === "}" || ch === "]") {
          completionStack.pop();
        }
      }
    }

    // If we're still in a string, close it first
    let finalContent = sanitized;
    if (inStringFinal) {
      finalContent += '"';
      hasChanges = true;
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

    if (addedDelimiters.length > 0) {
      hasChanges = true;
      diagnostics.push(SANITIZATION_STEP.COMPLETED_TRUNCATED_STRUCTURES);
    }

    sanitized = finalContent;

    // Step 5: Fix missing array object braces
    // Pattern 1: Corrupted array object starts with stray text before a property value
    const corruptedPatternWithValue = /(\}\s*,\s*)(\n?)(\s*)([a-zA-Z]{1,3})"([^"]+)"(\s*,)/g;
    sanitized = sanitized.replace(
      corruptedPatternWithValue,
      (match, braceComma, newline, indent, strayText, quotedValue, commaAfter, offset: unknown) => {
        const braceCommaStr = typeof braceComma === "string" ? braceComma : "";
        const newlineStr = typeof newline === "string" ? newline : "";
        const indentStr = typeof indent === "string" ? indent : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const quotedValueStr = typeof quotedValue === "string" ? quotedValue : "";
        const commaAfterStr = typeof commaAfter === "string" ? commaAfter : "";
        const numericOffset = typeof offset === "number" ? offset : 0;

        const isLikelyArrayContext = isInArrayContext(numericOffset, sanitized);
        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

        if (isLikelyArrayContext && !isStrayTextValid) {
          hasChanges = true;
          const properIndent = indentStr || "    ";
          const innerIndent = properIndent + "  ";

          diagnostics.push(
            `Fixed corrupted array object start: removed stray "${strayTextStr}" and inserted missing {"name": before "${quotedValueStr}"`,
          );

          const ensuredNewline = newlineStr || "\n";
          return `${braceCommaStr}${ensuredNewline}${properIndent}{\n${innerIndent}"name": "${quotedValueStr}"${commaAfterStr}`;
        }

        return match;
      },
    );

    // Pattern 2: Corrupted array object starts with stray text before a property name
    const corruptedPatternWithPropertyName = /(\}\s*,\s*)(\n?)(\s*)([a-zA-Z]{1,3})"([^"]+)"(\s*:)/g;
    sanitized = sanitized.replace(
      corruptedPatternWithPropertyName,
      (
        match,
        braceComma,
        newline,
        indent,
        strayText,
        quotedPropertyName,
        colonAfter,
        offset: unknown,
      ) => {
        const braceCommaStr = typeof braceComma === "string" ? braceComma : "";
        const newlineStr = typeof newline === "string" ? newline : "";
        const indentStr = typeof indent === "string" ? indent : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const quotedPropertyNameStr =
          typeof quotedPropertyName === "string" ? quotedPropertyName : "";
        const colonAfterStr = typeof colonAfter === "string" ? colonAfter : "";
        const numericOffset = typeof offset === "number" ? offset : 0;

        const isLikelyArrayContext = isInArrayContext(numericOffset, sanitized);
        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

        if (isLikelyArrayContext && !isStrayTextValid) {
          hasChanges = true;
          const properIndent = indentStr || "    ";
          const innerIndent = properIndent + "  ";

          diagnostics.push(
            `Fixed corrupted array object start: removed stray "${strayTextStr}" and inserted missing { before "${quotedPropertyNameStr}":`,
          );

          const ensuredNewline = newlineStr || "\n";
          return `${braceCommaStr}${ensuredNewline}${properIndent}{\n${innerIndent}"${quotedPropertyNameStr}"${colonAfterStr}`;
        }

        return match;
      },
    );

    // Pattern 3: Truncated array elements
    const truncatedElementPattern = /(\}\s*,)\s*\n(\s*)([a-zA-Z][a-zA-Z0-9_]*)"\s*,/g;
    sanitized = sanitized.replace(
      truncatedElementPattern,
      (match, closingBraceComma, whitespace, wordValue, offset: unknown) => {
        const closingBraceCommaStr = typeof closingBraceComma === "string" ? closingBraceComma : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const wordValueStr = typeof wordValue === "string" ? wordValue : "";
        const numericOffset = typeof offset === "number" ? offset : 0;

        const isLikelyArrayContext = isInArrayContext(numericOffset, sanitized);

        if (isLikelyArrayContext) {
          hasChanges = true;
          diagnostics.push(
            `Fixed truncated array element: inserted { and "name": before "${wordValueStr}"`,
          );

          const indentation = whitespaceStr || "    ";
          const propertyIndentation = indentation + "  ";

          return `${closingBraceCommaStr}\n${indentation}{\n${propertyIndentation}"name": "${wordValueStr}",`;
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== input;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? "Fixed structural errors (commas, delimiters, truncation)"
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixStructuralErrors sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
