import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { logWarn } from "../../../utils/logging";
import { REPAIR_STEP_TEMPLATE, REPAIR_STEP } from "../constants/repair-steps.config";
import { DELIMITERS, parsingHeuristics } from "../constants/json-processing.config";
import { isInArrayContext } from "../utils/parser-context-utils";

/**
 * Internal helper: Adds missing commas between object properties on separate lines.
 */
function addMissingCommasInternal(input: string): SanitizerResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { content: input, changed: false };
  }

  const missingCommaPattern = /(["}\]\]]|\d)\s*\n(\s*")([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
  const missingCommaInArrayPattern = /(["}\]\]])\s*\n(\s*)(["{])/g;
  const missingCommaBetweenQuotedStringsPattern = /"([^"]+)"\s*\n?(\s*)"([^"]+)"(\s*,|\s*\])/g;

  let sanitized = trimmed;
  let commaCount = 0;

  sanitized = sanitized.replace(
    missingCommaPattern,
    (match, terminator, quote2WithWhitespace, propertyName, offset) => {
      const offsetNum = typeof offset === "number" ? offset : 0;
      const terminatorStr = typeof terminator === "string" ? terminator : "";
      const quote2WithWhitespaceStr =
        typeof quote2WithWhitespace === "string" ? quote2WithWhitespace : "";
      const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

      if (terminatorStr === '"') {
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
        if (quoteCount % 2 === 1) {
          return match;
        }
      }

      const beforeNewline = sanitized.substring(Math.max(0, offsetNum - 10), offsetNum);
      if (beforeNewline.trim().endsWith(",")) {
        return match;
      }

      if (offsetNum < 5) {
        return match;
      }

      commaCount++;
      return `${terminatorStr},\n${quote2WithWhitespaceStr}${propertyNameStr}":`;
    },
  );

  sanitized = sanitized.replace(
    missingCommaBetweenQuotedStringsPattern,
    (match, value1, whitespace, value2, terminator, offset) => {
      const offsetNum = typeof offset === "number" ? offset : 0;
      const value1Str = typeof value1 === "string" ? value1 : "";
      const value2Str = typeof value2 === "string" ? value2 : "";
      const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
      const terminatorStr = typeof terminator === "string" ? terminator : "";

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

      const beforeMatch = sanitized.substring(
        Math.max(0, offsetNum - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
        offsetNum,
      );
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
        if (!inStringCheck && char === "[") {
          foundArray = true;
          break;
        }
      }

      if (foundArray) {
        const beforeFirstQuote = sanitized.substring(Math.max(0, offsetNum - 10), offsetNum);
        const trimmedBefore = beforeFirstQuote.trim();
        if (!trimmedBefore.endsWith(",")) {
          commaCount++;
          const newline = whitespaceStr ? "\n" : "";
          const spaceAfterComma = whitespaceStr ? "" : " ";
          return `"${value1Str}",${spaceAfterComma}${newline}${whitespaceStr}"${value2Str}"${terminatorStr}`;
        }
      }

      return match;
    },
  );

  sanitized = sanitized.replace(
    missingCommaInArrayPattern,
    (match, terminator, whitespace, nextElement, offset) => {
      const offsetNum = typeof offset === "number" ? offset : 0;
      const terminatorStr = typeof terminator === "string" ? terminator : "";
      const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
      const nextElementStr = typeof nextElement === "string" ? nextElement : "";

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

      const beforeMatch = sanitized.substring(
        Math.max(0, offsetNum - parsingHeuristics.CONTEXT_LOOKBACK_LENGTH),
        offsetNum,
      );
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
            if (bracketDepth === 0 && braceDepth <= 0) {
              foundArray = true;
              break;
            }
            bracketDepth--;
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

      const beforeNewline = sanitized.substring(Math.max(0, offsetNum - 10), offsetNum);
      if (beforeNewline.trim().endsWith(",")) {
        return match;
      }

      commaCount++;
      return `${terminatorStr},\n${whitespaceStr}${nextElementStr}`;
    },
  );

  if (commaCount > 0) {
    const description = REPAIR_STEP_TEMPLATE.addedMissingCommas(commaCount);
    return {
      content: sanitized,
      changed: true,
      description,
      repairs: [description],
    };
  }

  return { content: input, changed: false };
}

/**
 * Internal helper: Removes trailing commas before closing braces or brackets.
 * Enhanced to handle various whitespace arrangements including newlines and tabs.
 */
function removeTrailingCommasInternal(input: string): SanitizerResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { content: input, changed: false };
  }

  // Enhanced pattern that handles:
  // - Commas followed by any whitespace (spaces, tabs, newlines) and closing delimiter
  // - Commas on same line or different lines from closing delimiter
  // - Multiple whitespace characters
  const trailingCommaPattern = /(,)(\s*)([}\]])/g;
  const beforeRemoval = trimmed;
  let sanitized = trimmed;
  let commaCount = 0;

  sanitized = sanitized.replace(
    trailingCommaPattern,
    (match, _comma, _whitespace, delimiter, offset: number) => {
      // Check if we're inside a string literal by counting quotes before this position
      let inString = false;
      let escaped = false;
      for (let i = 0; i < offset; i++) {
        const char = sanitized[i];
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

      // Don't remove if we're inside a string
      if (inString) {
        return match;
      }

      commaCount++;
      // Remove comma and whitespace, just keep the delimiter
      // This matches the original behavior: trailing commas should be completely removed
      const delimiterStr = typeof delimiter === "string" ? delimiter : "";
      return delimiterStr;
    },
  );

  if (sanitized !== beforeRemoval) {
    return {
      content: sanitized,
      changed: true,
      description: REPAIR_STEP.REMOVED_TRAILING_COMMAS,
      repairs: [
        REPAIR_STEP.REMOVED_TRAILING_COMMAS,
        `Removed ${commaCount} trailing comma${commaCount !== 1 ? "s" : ""}`,
      ],
    };
  }

  return { content: input, changed: false };
}

/**
 * Internal helper: Fixes mismatched delimiters (brackets and braces).
 */
function fixMismatchedDelimitersInternal(input: string): SanitizerResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { content: input, changed: false };
  }

  const chars = Array.from(trimmed);
  const result: string[] = [];
  let i = 0;

  let inString = false;
  let escapeNext = false;
  const delimiterStack: { opener: string; index: number }[] = [];
  const delimiterCorrections: {
    index: number;
    wrongChar: string;
    correctChar: string;
    insertAfter?: string;
  }[] = [];

  const peekNextNonWhitespace = (startIdx: number): string | null => {
    const remaining = trimmed.substring(startIdx + 1);
    const regex = /[^\s,]/;
    const match = regex.exec(remaining);
    return match ? match[0] : null;
  };

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
            if (
              char === DELIMITERS.CLOSE_BRACKET &&
              expectedCloser === DELIMITERS.CLOSE_BRACE &&
              delimiterStack.length >= 1 &&
              delimiterStack.at(-1)?.opener === DELIMITERS.OPEN_BRACKET
            ) {
              const nextChar = peekNextNonWhitespace(i);
              if (nextChar === DELIMITERS.DOUBLE_QUOTE) {
                delimiterCorrections.push({
                  index: result.length,
                  wrongChar: char,
                  correctChar: DELIMITERS.CLOSE_BRACE,
                  insertAfter: DELIMITERS.CLOSE_BRACKET,
                });
                delimiterStack.pop();
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
            result.push(char);
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

  if (delimiterCorrections.length === 0) {
    return { content: input, changed: false };
  }

  let workingContent = result.join("");
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

  return {
    content: workingContent,
    changed: true,
    description: REPAIR_STEP_TEMPLATE.fixedMismatchedDelimiters(delimiterCorrections.length),
    repairs: [REPAIR_STEP_TEMPLATE.fixedMismatchedDelimiters(delimiterCorrections.length)],
  };
}

/**
 * Internal helper: Completes truncated JSON structures by adding missing closing delimiters.
 */
function completeTruncatedStructuresInternal(input: string): SanitizerResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { content: input, changed: false };
  }

  if (trimmed.endsWith("}") || trimmed.endsWith("]")) {
    return { content: input, changed: false };
  }

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

  let finalContent = trimmed;
  if (inString) {
    finalContent += '"';
  }

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
      description: REPAIR_STEP.COMPLETED_TRUNCATED_STRUCTURES,
      repairs: [
        `Added ${addedDelimiters.length} closing delimiter${addedDelimiters.length !== 1 ? "s" : ""}${inString ? " and closed incomplete string" : ""}`,
      ],
    };
  }

  return { content: input, changed: false };
}

/**
 * Internal helper: Fixes missing opening braces for new objects in arrays.
 */
function fixMissingArrayObjectBracesInternal(input: string): SanitizerResult {
  try {
    let sanitized = input;
    let hasChanges = false;
    const repairs: string[] = [];

    const corruptedPatternWithValue = /(\}\s*,\s*)(\n?)(\s*)([a-zA-Z]{1,3})"([^"]+)"(\s*,)/g;

    sanitized = sanitized.replace(
      corruptedPatternWithValue,
      (match, braceComma, newline, indent, strayText, quotedValue, commaAfter, offset: number) => {
        const braceCommaStr = typeof braceComma === "string" ? braceComma : "";
        const newlineStr = typeof newline === "string" ? newline : "";
        const indentStr = typeof indent === "string" ? indent : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const quotedValueStr = typeof quotedValue === "string" ? quotedValue : "";
        const commaAfterStr = typeof commaAfter === "string" ? commaAfter : "";

        const isLikelyArrayContext = isInArrayContext(offset, sanitized);
        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

        if (isLikelyArrayContext && !isStrayTextValid) {
          hasChanges = true;
          const properIndent = indentStr || "    ";
          const innerIndent = properIndent + "  ";

          repairs.push(
            `Fixed corrupted array object start: removed stray "${strayTextStr}" and inserted missing {"name": before "${quotedValueStr}"`,
          );

          const ensuredNewline = newlineStr || "\n";
          return `${braceCommaStr}${ensuredNewline}${properIndent}{\n${innerIndent}"name": "${quotedValueStr}"${commaAfterStr}`;
        }

        return match;
      },
    );

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
        offset: number,
      ) => {
        const braceCommaStr = typeof braceComma === "string" ? braceComma : "";
        const newlineStr = typeof newline === "string" ? newline : "";
        const indentStr = typeof indent === "string" ? indent : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const quotedPropertyNameStr =
          typeof quotedPropertyName === "string" ? quotedPropertyName : "";
        const colonAfterStr = typeof colonAfter === "string" ? colonAfter : "";

        const isLikelyArrayContext = isInArrayContext(offset, sanitized);
        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

        if (isLikelyArrayContext && !isStrayTextValid) {
          hasChanges = true;
          const properIndent = indentStr || "    ";
          const innerIndent = properIndent + "  ";

          repairs.push(
            `Fixed corrupted array object start: removed stray "${strayTextStr}" and inserted missing { before "${quotedPropertyNameStr}":`,
          );

          const ensuredNewline = newlineStr || "\n";
          return `${braceCommaStr}${ensuredNewline}${properIndent}{\n${innerIndent}"${quotedPropertyNameStr}"${colonAfterStr}`;
        }

        return match;
      },
    );

    const truncatedElementPattern = /(\}\s*,)\s*\n(\s*)([a-zA-Z][a-zA-Z0-9_]*)"\s*,/g;

    sanitized = sanitized.replace(
      truncatedElementPattern,
      (match, closingBraceComma, whitespace, wordValue, offset: number) => {
        const closingBraceCommaStr = typeof closingBraceComma === "string" ? closingBraceComma : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const wordValueStr = typeof wordValue === "string" ? wordValue : "";

        const isLikelyArrayContext = isInArrayContext(offset, sanitized);

        if (isLikelyArrayContext) {
          hasChanges = true;
          repairs.push(
            `Fixed truncated array element: inserted { and "name": before "${wordValueStr}"`,
          );

          const indentation = whitespaceStr || "    ";
          const propertyIndentation = indentation + "  ";

          return `${closingBraceCommaStr}\n${indentation}{\n${propertyIndentation}"name": "${wordValueStr}",`;
        }

        return match;
      },
    );

    hasChanges = sanitized !== input;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? "Fixed missing opening braces for new objects in arrays"
        : undefined,
      repairs: hasChanges && repairs.length > 0 ? repairs : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logWarn(`fixMissingArrayObjectBracesInternal failed: ${errorMessage}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      repairs: [`Sanitizer failed: ${errorMessage}`],
    };
  }
}

/**
 * Consolidated syntax sanitizer that fixes common JSON syntax errors.
 *
 * This sanitizer combines the functionality of multiple syntax fix sanitizers:
 * 1. addMissingCommas: Insert missing commas between properties on separate lines
 * 2. removeTrailingCommas: Remove invalid trailing commas before closing delimiters
 * 3. fixMismatchedDelimiters: Correct bracket/brace mismatches
 * 4. completeTruncatedStructures: Close unclosed brackets/braces from truncated responses
 * 5. fixMissingArrayObjectBraces: Insert missing opening braces for new objects in arrays
 *
 * ## Purpose
 * LLMs sometimes generate JSON with syntax errors like missing commas, mismatched delimiters,
 * and incomplete structures. This sanitizer fixes these issues in a logical order.
 *
 * ## Implementation Order
 * The sanitizers are applied in this order for optimal results:
 * 1. Add missing commas (fixes structure before other fixes)
 * 2. Remove trailing commas (cleans up invalid syntax)
 * 3. Fix mismatched delimiters (corrects structural errors)
 * 4. Complete truncated structures (closes incomplete JSON)
 * 5. Fix missing array object braces (handles array-specific issues)
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with syntax fixes applied
 */
export const fixJsonSyntax: Sanitizer = (input: string): SanitizerResult => {
  try {
    if (!input) {
      return { content: input, changed: false };
    }

    let sanitized = input;
    let hasChanges = false;
    const repairs: string[] = [];

    // Step 1: Add missing commas
    const commaResult = addMissingCommasInternal(sanitized);
    if (commaResult.changed) {
      sanitized = commaResult.content;
      hasChanges = true;
      if (commaResult.description) {
        repairs.push(commaResult.description);
      }
      if (commaResult.repairs) {
        repairs.push(...commaResult.repairs);
      }
    }

    // Step 2: Remove trailing commas
    const trailingCommaResult = removeTrailingCommasInternal(sanitized);
    if (trailingCommaResult.changed) {
      sanitized = trailingCommaResult.content;
      hasChanges = true;
      if (trailingCommaResult.description) {
        repairs.push(trailingCommaResult.description);
      }
      if (trailingCommaResult.repairs) {
        repairs.push(...trailingCommaResult.repairs);
      }
    }

    // Step 3: Fix mismatched delimiters
    const delimiterResult = fixMismatchedDelimitersInternal(sanitized);
    if (delimiterResult.changed) {
      sanitized = delimiterResult.content;
      hasChanges = true;
      if (delimiterResult.description) {
        repairs.push(delimiterResult.description);
      }
      if (delimiterResult.repairs) {
        repairs.push(...delimiterResult.repairs);
      }
    }

    // Step 4: Complete truncated structures
    const truncationResult = completeTruncatedStructuresInternal(sanitized);
    if (truncationResult.changed) {
      sanitized = truncationResult.content;
      hasChanges = true;
      if (truncationResult.description) {
        repairs.push(truncationResult.description);
      }
      if (truncationResult.repairs) {
        repairs.push(...truncationResult.repairs);
      }
    }

    // Step 5: Fix missing array object braces
    const arrayBracesResult = fixMissingArrayObjectBracesInternal(sanitized);
    if (arrayBracesResult.changed) {
      sanitized = arrayBracesResult.content;
      hasChanges = true;
      if (arrayBracesResult.description) {
        repairs.push(arrayBracesResult.description);
      }
      if (arrayBracesResult.repairs) {
        repairs.push(...arrayBracesResult.repairs);
      }
    }

    if (!hasChanges) {
      return { content: input, changed: false };
    }

    return {
      content: sanitized,
      changed: true,
      description: "Fixed JSON syntax errors",
      repairs: repairs.length > 0 ? repairs : undefined,
    };
  } catch (error) {
    logWarn(`fixJsonSyntax sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      repairs: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
