import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { logSingleLineWarning } from "../../../common/utils/logging";

/**
 * Helper function to check if we're in an array context by scanning backwards.
 * Returns true if we're inside an array of objects.
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
 * Consolidated sanitizer that fixes missing opening braces for new objects in arrays.
 *
 * This sanitizer consolidates the functionality of 3 separate sanitizers:
 * 1. fix-missing-opening-braces.ts - Inserts missing `{` when property patterns appear after `},`
 * 2. fix-corrupted-array-object-start.ts - Handles stray text before values/names, inserts `{` and sometimes `"name":`
 * 3. fix-truncated-array-elements.ts - Handles truncated elements, inserts `{` and `"name":`
 *
 * ## Fixes Applied
 *
 * 1. **Missing Opening Brace**: Inserts `{` when `},` is followed by property-like patterns
 * 2. **Corrupted Array Object Start (Value)**: Removes stray text before values and inserts `{` and `"name":`
 * 3. **Corrupted Array Object Start (Property)**: Removes stray text before property names and inserts `{`
 * 4. **Truncated Array Elements**: Inserts `{` and `"name":` for truncated array elements
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with all missing array object braces fixed
 */
export const fixMissingArrayObjectBraces: Sanitizer = (input: string): SanitizerResult => {
  try {
    let sanitized = input;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern 1: Corrupted array object starts with stray text before a property value
    // Matches: }, strayText"value",
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
    // Matches: }, strayText"propertyName":
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

    // Pattern 3: Truncated array elements - word pattern with quotes + comma
    // Matches: },\n  wordValue",
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

    // Pattern 4: Truncated elements with newline before next property
    // Matches: },\ntoInteger",\n  "purpose":
    const truncatedElementWithNewlinePattern =
      /(\}\s*,)\s*\n(\s*)([a-zA-Z][a-zA-Z0-9_]*)"\s*,\s*\n(\s*)"([a-zA-Z_$][a-zA-Z0-9_$.]*)"/g;

    sanitized = sanitized.replace(
      truncatedElementWithNewlinePattern,
      (
        match,
        closingBraceComma,
        whitespace1,
        wordValue,
        whitespace2,
        nextProperty,
        offset: unknown,
      ) => {
        const closingBraceCommaStr = typeof closingBraceComma === "string" ? closingBraceComma : "";
        const whitespace1Str = typeof whitespace1 === "string" ? whitespace1 : "";
        const wordValueStr = typeof wordValue === "string" ? wordValue : "";
        const whitespace2Str = typeof whitespace2 === "string" ? whitespace2 : "";
        const nextPropertyStr = typeof nextProperty === "string" ? nextProperty : "";
        const numericOffset = typeof offset === "number" ? offset : 0;

        const isLikelyArrayContext = isInArrayContext(numericOffset, sanitized);

        if (isLikelyArrayContext) {
          hasChanges = true;
          diagnostics.push(
            `Fixed truncated array element: inserted { and "name": before "${wordValueStr}"`,
          );

          const indentation = whitespace1Str || "    ";
          const propertyIndentation = indentation + "  ";

          return `${closingBraceCommaStr}\n${indentation}{\n${propertyIndentation}"name": "${wordValueStr}",\n${whitespace2Str}"${nextPropertyStr}"`;
        }

        return match;
      },
    );

    // Pattern 5: Truncated elements without quotes
    // Matches: },\n  wordValue\n  "nextProperty"
    const truncatedElementWithoutQuotePattern =
      /(\}\s*,)\s*\n(\s*)([a-z][a-zA-Z0-9_]*)\s*\n(\s*)"([a-z][a-zA-Z0-9_]*)"/g;

    sanitized = sanitized.replace(
      truncatedElementWithoutQuotePattern,
      (
        match,
        closingBraceComma,
        whitespace1,
        firstWord,
        whitespace2,
        secondWord,
        offset: unknown,
      ) => {
        const closingBraceCommaStr = typeof closingBraceComma === "string" ? closingBraceComma : "";
        const whitespace1Str = typeof whitespace1 === "string" ? whitespace1 : "";
        const firstWordStr = typeof firstWord === "string" ? firstWord : "";
        const whitespace2Str = typeof whitespace2 === "string" ? whitespace2 : "";
        const secondWordStr = typeof secondWord === "string" ? secondWord : "";
        const numericOffset = typeof offset === "number" ? offset : 0;

        const isLikelyArrayContext = isInArrayContext(numericOffset, sanitized);

        if (isLikelyArrayContext) {
          hasChanges = true;
          diagnostics.push(
            `Fixed truncated array element: inserted { and "name": before "${firstWordStr}"`,
          );

          const indentation = whitespace1Str || "    ";
          const propertyIndentation = indentation + "  ";

          return `${closingBraceCommaStr}\n${indentation}{\n${propertyIndentation}"name": "${firstWordStr}",\n${whitespace2Str}"${secondWordStr}"`;
        }

        return match;
      },
    );

    // Pattern 6: Missing opening brace for property-like patterns
    // Matches: },\n  "propertyName": or },\n  "propertyName": "value",
    const missingOpeningBracePattern =
      /(\}\s*,)\s*\n(\s*)([a-zA-Z]{1,3}?"[a-zA-Z_$][a-zA-Z0-9_$]*"(?:\s*:|\s*,|")|[a-zA-Z]{1,3}"[^"]+"|"[a-zA-Z_$][a-zA-Z0-9_$]*"(?:\s*:(?:\s*"[^"]*")?\s*,?)?)/g;

    // Use matchAll to get all matches with their positions
    const matches: { match: RegExpMatchArray; index: number }[] = [];
    let match;
    const regex = new RegExp(missingOpeningBracePattern);
    while ((match = regex.exec(sanitized)) !== null) {
      matches.push({ match, index: match.index });
    }

    // Process matches in reverse order to avoid position shifts
    for (let i = matches.length - 1; i >= 0; i--) {
      const { match: matchResult, index: matchIndex } = matches[i];
      const closingBraceComma = matchResult[1] || "";
      const whitespace = matchResult[2] || "";
      const propertyPattern = matchResult[3] || "";

      // Check if we're in an array context
      const beforeMatch = sanitized.substring(0, matchIndex);

      let braceDepth = 0;
      let bracketDepth = 0;
      let inStringCheck = false;
      let escapeCheck = false;
      let inArrayContext = false;
      let braceDepthAtArrayStart = 0;
      let arrayStartPosition = -1;

      for (let j = beforeMatch.length - 1; j >= 0; j--) {
        const char = beforeMatch[j];
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
          if (char === "}") {
            braceDepth++;
          } else if (char === "{") {
            braceDepth--;
          } else if (char === "]") {
            bracketDepth++;
          } else if (char === "[") {
            bracketDepth--;
            if (braceDepth <= 0 && bracketDepth <= 0) {
              const afterArrayStart = sanitized.substring(j, Math.min(j + 100, matchIndex));
              if (afterArrayStart.includes("{")) {
                if (!inArrayContext || j < arrayStartPosition) {
                  inArrayContext = true;
                  arrayStartPosition = j;
                  braceDepthAtArrayStart = braceDepth;
                }
              }
            }
          }
        }
      }

      const looksLikeProperty = propertyPattern.includes(":") || propertyPattern.endsWith(",");
      if (inArrayContext && looksLikeProperty && braceDepthAtArrayStart <= 0) {
        const matchText = matchResult[0];
        const replacement = `${closingBraceComma}\n${whitespace}{\n${whitespace}  ${propertyPattern}`;
        sanitized =
          sanitized.substring(0, matchIndex) +
          replacement +
          sanitized.substring(matchIndex + matchText.length);
        hasChanges = true;
        diagnostics.push("Inserted missing opening brace for new object in array");
      }
    }

    // Pattern 7: Remove stray text after array closing bracket
    // Matches: `]\n    org.apache...` or `]org.apache...` where text appears after array close
    const strayTextAfterArrayPattern = /(\])\s*\n?(\s*)([a-zA-Z][a-zA-Z0-9_.]*)"(\s*[,}\]]|$)/g;
    sanitized = sanitized.replace(
      strayTextAfterArrayPattern,
      (match, closingBracket, _whitespace, strayText, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const closingBracketStr = typeof closingBracket === "string" ? closingBracket : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        // Check if we're in a string
        let inString = false;
        let escaped = false;
        for (let i = 0; i < numericOffset; i++) {
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

        // Check if we're actually after an array closing bracket
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        let bracketDepth = 0;
        let braceDepth = 0;
        let inStringCheck = false;
        let escapeCheck = false;
        let foundArrayClose = false;

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
            if (char === "[") {
              bracketDepth++;
              if (bracketDepth > 0 && braceDepth <= 0) {
                foundArrayClose = true;
                break;
              }
            } else if (char === "]") {
              bracketDepth--;
            } else if (char === "}") {
              braceDepth++;
            } else if (char === "{") {
              braceDepth--;
            }
          }
        }

        // Also check if the closing bracket is immediately before this position
        if (foundArrayClose || (numericOffset > 0 && sanitized[numericOffset - 1] === "]")) {
          hasChanges = true;
          if (diagnostics.length < 20) {
            diagnostics.push(`Removed stray text after array: ${strayTextStr}" after ]`);
          }
          // Remove the stray text, keep the closing bracket and terminator
          return `${closingBracketStr}${terminatorStr}`;
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
        ? "Fixed missing opening braces for new objects in arrays"
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logSingleLineWarning(`fixMissingArrayObjectBraces sanitizer failed: ${errorMessage}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${errorMessage}`],
    };
  }
};
