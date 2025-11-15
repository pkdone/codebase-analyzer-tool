import { Sanitizer, SanitizerResult } from "./sanitizers-types";

/**
 * Sanitizer that fixes various malformed JSON patterns found in LLM responses.
 *
 * This sanitizer handles:
 * 1. Malformed string references (missing dots, typos, weird characters like `org.apachefineract`, `orgf.apache.fineract`, `orgah.apache.fineract`, `orgʻ.apache.fineract`, `_MODULE"`)
 * 2. Extra single characters before properties (like `a  "integrationPoints":`, `s  "publicMethods":`, `e "externalReferences":`, `c{`)
 * 3. Corrupted property values (like `"linesOfCode":_CODE`4,`)
 * 4. Invalid property names (like `extra_code_analysis:`)
 * 5. Duplicate closing braces at the end
 * 6. Missing quotes on property names (like `name":` instead of `"name":`)
 * 7. Non-ASCII characters in string values that break JSON parsing
 *
 * @param input - The raw string content to sanitize
 * @returns Sanitizer result with malformed patterns fixed
 */
export const fixMalformedJsonPatterns: Sanitizer = (input: string): SanitizerResult => {
  try {
    if (!input) {
      return { content: input, changed: false };
    }

    // Quick check: if the input is valid JSON and doesn't contain obvious errors, don't modify it
    // This prevents unnecessary modifications to valid JSON while still allowing fixes for typos
    try {
      JSON.parse(input);
      // Check if there are obvious errors that need fixing (typos, missing dots, etc.)
      const hasObviousErrors = /orgfineract|orgahce|jakarta\.ws-rs|orgf\.apache|orgah\.apache/.test(
        input,
      );
      if (!hasObviousErrors) {
        // Valid JSON with no obvious errors, return as-is
        return { content: input, changed: false };
      }
      // Valid JSON but has errors, proceed with sanitization
    } catch {
      // Not valid JSON, proceed with sanitization
    }

    let sanitized = input;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Helper to check if we're inside a string at a given position
    const isInStringAt = (position: number, content: string): boolean => {
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
    };

    // ===== Pattern 1: Fix malformed string references in arrays =====
    // Pattern: Missing dots (org.apachefineract -> org.apache.fineract)
    const missingDotPattern = /"org\.apache([a-z])([a-z]+)\./g;
    sanitized = sanitized.replace(missingDotPattern, (match, first, rest, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }
      hasChanges = true;
      if (diagnostics.length < 10) {
        diagnostics.push(
          `Fixed missing dot in package reference: org.apache${first}${rest} -> org.apache.${first}${rest}`,
        );
      }
      return `"org.apache.${first}${rest}.`;
    });

    // Pattern: Typos (orgf.apache.fineract -> org.apache.fineract, orgah.apache.fineract -> org.apache.fineract)
    const typoPattern = /"org([fh]|ah|ʻ)\.apache\./g;
    sanitized = sanitized.replace(typoPattern, (match, typo, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }
      hasChanges = true;
      if (diagnostics.length < 10) {
        diagnostics.push(`Fixed typo in package reference: org${typo}.apache -> org.apache`);
      }
      return '"org.apache.';
    });

    // Pattern: More complex typos like orgahce.fineract -> org.apache.fineract
    const complexTypoPattern = /"orgahce\.fineract\./g;
    sanitized = sanitized.replace(complexTypoPattern, (match, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }
      hasChanges = true;
      if (diagnostics.length < 10) {
        diagnostics.push(
          "Fixed typo in package reference: orgahce.fineract -> org.apache.fineract",
        );
      }
      return '"org.apache.fineract.';
    });

    // Pattern: Corrupted entries like _MODULE",
    sanitized = sanitized.replace(
      /([}\],])\s*\n\s*_MODULE"\s*,?\s*\n/g,
      (match, delimiter, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }
        hasChanges = true;
        if (diagnostics.length < 10) {
          diagnostics.push("Removed _MODULE corrupted reference from array");
        }
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        return `${delimiterStr}\n`;
      },
    );

    // ===== Pattern 2: Remove extra single characters before properties =====
    // Pattern: `a  "integrationPoints":`, `s  "publicMethods":`, `e "externalReferences":`
    const extraCharBeforePropertyPattern =
      /([}\],]|\n|^)(\s*)([a-z])\s+("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g;
    sanitized = sanitized.replace(
      extraCharBeforePropertyPattern,
      (
        match,
        delimiter,
        whitespace,
        extraChar,
        propertyWithQuote,
        _propertyName,
        offset: unknown,
      ) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context (after delimiter, newline, or start)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isValidContext =
          /[}\],]\s*$/.test(beforeMatch) || /^\s*$/.test(beforeMatch) || numericOffset < 100;

        if (isValidContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyWithQuoteStr =
            typeof propertyWithQuote === "string" ? propertyWithQuote : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed extra character '${extraChar}' before property`);
          }
          return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
        }

        return match;
      },
    );

    // Pattern: `c{` (single character before opening brace)
    const extraCharBeforeBracePattern = /([}\],]|\n|^)(\s*)([a-z])\s*{/g;
    sanitized = sanitized.replace(
      extraCharBeforeBracePattern,
      (match, delimiter, whitespace, extraChar, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isValidContext =
          /[}\],]\s*$/.test(beforeMatch) || /^\s*$/.test(beforeMatch) || numericOffset < 100;

        if (isValidContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed extra character '${extraChar}' before opening brace`);
          }
          return `${delimiterStr}${whitespaceStr}{`;
        }

        return match;
      },
    );

    // ===== Pattern 3: Fix corrupted property values =====
    // Pattern: `"linesOfCode":_CODE`4,` -> `"linesOfCode": 4,`
    const corruptedValuePattern = /"([^"]+)"\s*:\s*_CODE`(\d+)(\s*[,}])/g;
    sanitized = sanitized.replace(
      corruptedValuePattern,
      (match, propertyName, digits, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const digitsStr = typeof digits === "string" ? digits : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed corrupted property value: "${propertyNameStr}":_CODE\`${digitsStr} -> "${propertyNameStr}": ${digitsStr}`,
          );
        }
        return `"${propertyNameStr}": ${digitsStr}${terminatorStr}`;
      },
    );

    // ===== Pattern 4: Remove invalid property names =====
    // Pattern: `extra_code_analysis: {` -> remove this entire property block
    // First, try to find and remove the property with its value
    sanitized = sanitized.replace(
      /([}\],]|\n|^)(\s*)(extra_code_analysis:)\s*{/g,
      (match, delimiter, whitespace, invalidProp, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Find the matching closing brace
        let braceCount = 1;
        let i = numericOffset + match.length;
        let foundClosing = false;

        while (i < sanitized.length && braceCount > 0) {
          const char = sanitized[i];
          if (char === "\\") {
            i += 2;
            continue;
          }
          if (char === '"') {
            i++;
            while (i < sanitized.length && sanitized[i] !== '"') {
              if (sanitized[i] === "\\") {
                i += 2;
              } else {
                i++;
              }
            }
            i++;
            continue;
          }
          if (char === "{") {
            braceCount++;
          } else if (char === "}") {
            braceCount--;
            if (braceCount === 0) {
              foundClosing = true;
              break;
            }
          }
          i++;
        }

        if (foundClosing) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          // Remove the entire block including the closing brace and any trailing comma
          const endIndex = i + 1;
          const afterBlock = sanitized.substring(endIndex);
          const commaMatch = /^\s*,?\s*/.exec(afterBlock);
          const commaLength = commaMatch ? commaMatch[0].length : 0;
          sanitized =
            sanitized.substring(0, numericOffset) +
            delimiterStr +
            whitespaceStr +
            sanitized.substring(endIndex + commaLength);
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed invalid property block: ${invalidProp}`);
          }
          return "";
        }

        return match;
      },
    );

    // ===== Pattern 5: Remove duplicate closing braces at the end =====
    // Pattern: Multiple `}` at the end of the file
    const duplicateBracesPattern = /(})\s*\n\s*(}\s*\n\s*){2,}\s*$/;
    sanitized = sanitized.replace(duplicateBracesPattern, () => {
      hasChanges = true;
      if (diagnostics.length < 10) {
        diagnostics.push("Removed duplicate closing braces at end");
      }
      // Keep only one closing brace
      return "}\n";
    });

    // ===== Pattern 6: Fix missing quotes on property names =====
    // Pattern: `name":` instead of `"name":`
    const missingOpeningQuotePattern = /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    sanitized = sanitized.replace(
      missingOpeningQuotePattern,
      (match, delimiter, whitespace, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isValidContext =
          /[}\],]\s*$/.test(beforeMatch) || /^\s*$/.test(beforeMatch) || numericOffset < 100;

        if (isValidContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing opening quote: ${propertyNameStr}" -> "${propertyNameStr}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // ===== Pattern 7: Clean non-ASCII characters from string values =====
    // Pattern: Bengali text like `করে"java.util.Arrays",` -> `"java.util.Arrays",`
    // This should only clean non-ASCII characters that appear outside of valid JSON string boundaries
    // eslint-disable-next-line no-control-regex
    const nonAsciiInArrayPattern = /([}\],]|\n|^)(\s*)([^\x00-\x7F]+)"([^"]+)"\s*,/g;
    sanitized = sanitized.replace(
      nonAsciiInArrayPattern,
      (match, delimiter, whitespace, _nonAscii, stringValue, offset: unknown) => {
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
                // We're in an array context
                hasChanges = true;
                const delimiterStr = typeof delimiter === "string" ? delimiter : "";
                const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
                const stringValueStr = typeof stringValue === "string" ? stringValue : "";
                if (diagnostics.length < 10) {
                  diagnostics.push(
                    `Removed non-ASCII characters before array element: "${stringValueStr.substring(0, 30)}..."`,
                  );
                }
                return `${delimiterStr}${whitespaceStr}"${stringValueStr}",`;
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

    // ===== Pattern 8: Fix space before quote in property names =====
    // Pattern: `"name "groupId",` -> `"name": "groupId",`
    const spaceBeforeQuotePattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)\s+"([^"]+)"/g;
    sanitized = sanitized.replace(
      spaceBeforeQuotePattern,
      (match, propertyName, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if this looks like a property name followed by a value
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed space before quote: "${propertyNameStr} " -> "${propertyNameStr}": "${valueStr}"`,
            );
          }
          return `"${propertyNameStr}": "${valueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 9: Fix missing comma after array element =====
    // Pattern: `"value"]` -> `"value"],` (when it should be followed by another element)
    // This is handled by addMissingCommas, but we can add a specific fix here for edge cases
    const missingCommaAfterArrayElementPattern = /"([^"]+)"\s*\n\s*"([^"]+)"\s*:/g;
    sanitized = sanitized.replace(
      missingCommaAfterArrayElementPattern,
      (match, value1, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context and value1 should be followed by a comma
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray = /\[\s*$/.test(beforeMatch) || /,\s*\n\s*$/.test(beforeMatch);
        const value1Str = typeof value1 === "string" ? value1 : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

        if (isInArray && propertyNameStr.length > 0) {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(`Added missing comma after array element: "${value1Str}"`);
          }
          return `"${value1Str}",\n    "${propertyNameStr}":`;
        }

        return match;
      },
    );

    // ===== Pattern 10: Fix malformed property name with mixed colon/quote =====
    // Pattern: `"name":toBe": "apiRequestBodyAsJson"` -> `"name": "apiRequestBodyAsJson"`
    // This handles cases where a short word got inserted between the colon and the quote
    const malformedPropertyColonQuotePattern = /"([^"]+)"\s*:\s*([a-z]{2,10})"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      malformedPropertyColonQuotePattern,
      (match, propertyName, insertedWord, actualValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const insertedWordStr = typeof insertedWord === "string" ? insertedWord : "";
        const actualValueStr = typeof actualValue === "string" ? actualValue : "";

        // Check if this looks like a malformed property where a word got inserted
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        // If we're in a property context, remove the inserted word
        // This handles cases like "name":toBe": "value" -> "name": "value"
        if (isPropertyContext) {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed malformed property: "${propertyNameStr}":${insertedWordStr}": "${actualValueStr}" -> "${propertyNameStr}": "${actualValueStr}"`,
            );
          }
          return `"${propertyNameStr}": "${actualValueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 11: Remove stray single characters before property names =====
    // Pattern: `t      "name":` -> `      "name":`
    // Also handles: `t      "mechanism":` in arrays
    const strayCharBeforePropertyPattern =
      /([}\],]|\n|^)(\s*)([a-z])\s+("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g;
    sanitized = sanitized.replace(
      strayCharBeforePropertyPattern,
      (
        match,
        delimiter,
        whitespace,
        strayChar,
        propertyWithQuote,
        _propertyName,
        offset: unknown,
      ) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context (after delimiter, newline, or start)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isValidContext =
          /[}\],]\s*$/.test(beforeMatch) ||
          /^\s*$/.test(beforeMatch) ||
          numericOffset < 100 ||
          /,\s*\n\s*$/.test(beforeMatch);

        // Also check if we're in an array context (after a comma in an array)
        let isInArrayContext = false;
        if (!isValidContext) {
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
                  isInArrayContext = true;
                  break;
                }
              } else if (char === "}") {
                braceDepth++;
              } else if (char === "{") {
                braceDepth--;
              }
            }
          }
        }

        if (isValidContext || isInArrayContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyWithQuoteStr =
            typeof propertyWithQuote === "string" ? propertyWithQuote : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed stray character '${strayChar}' before property`);
          }
          return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 12: Remove stray text before string values in arrays =====
    // Pattern: `thank"lombok.RequiredArgsConstructor",` -> `"lombok.RequiredArgsConstructor",`
    const strayTextBeforeStringPattern = /([}\],]|\n|^)(\s*)([a-z]{2,10})"([^"]+)"\s*,/g;
    sanitized = sanitized.replace(
      strayTextBeforeStringPattern,
      (match, delimiter, whitespace, strayText, stringValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray = /\[\s*$/.test(beforeMatch) || /,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const stringValueStr = typeof stringValue === "string" ? stringValue : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray text '${strayText}' before array element: "${stringValueStr.substring(0, 30)}..."`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${stringValueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 13: Fix malformed objects with unquoted properties =====
    // Pattern: `{hoge}` -> `{}` (remove invalid object)
    const malformedObjectPattern = /([}\],]|\n|^)(\s*){([a-zA-Z_$][a-zA-Z0-9_$]*)}\s*([,}\]]|$)/g;
    sanitized = sanitized.replace(
      malformedObjectPattern,
      (match, delimiter, whitespace, invalidProp, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isValidContext =
          /[}\],]\s*$/.test(beforeMatch) || /^\s*$/.test(beforeMatch) || numericOffset < 100;

        if (isValidContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed malformed object: {${invalidProp}}`);
          }
          return `${delimiterStr}${whitespaceStr}{}${terminatorStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 14: Remove stray text after closing braces =====
    // Pattern: `},ce` -> `},`
    const strayTextAfterBraceCommaPattern = /([}\]])\s*,\s*([a-z]{1,5})(\s*[}\]]|\s*\n\s*[{"])/g;
    sanitized = sanitized.replace(
      strayTextAfterBraceCommaPattern,
      (match, delimiter, strayText, nextToken, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if it's clearly stray text (not JSON keywords)
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const jsonKeywords = ["true", "false", "null", "undefined"];
        if (!jsonKeywords.includes(strayTextStr.toLowerCase())) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const nextTokenStr = typeof nextToken === "string" ? nextToken : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed stray text '${strayTextStr}' after ${delimiterStr}`);
          }
          return `${delimiterStr},${nextTokenStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 15: Remove stray text before property names =====
    // Pattern: ` tribulations":` -> `"integrationPoints":` (or remove if invalid)
    const strayTextBeforePropertyNamePattern =
      /([}\],]|\n|^)(\s*)([a-z\s]{1,20})"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    sanitized = sanitized.replace(
      strayTextBeforePropertyNamePattern,
      (match, delimiter, whitespace, strayText, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isValidContext =
          /[}\],]\s*$/.test(beforeMatch) || /^\s*$/.test(beforeMatch) || numericOffset < 100;

        if (isValidContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const strayTextStr = typeof strayText === "string" ? strayText : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray text '${strayTextStr.trim()}' before property: "${propertyNameStr}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // ===== Pattern 16: Remove invalid property-like structures =====
    // Pattern: `extra_text="  * `DatatableExportTargetParameter`..."` -> remove entire line
    const invalidPropertyPattern = /([}\],]|\n|^)(\s*)(extra_[a-zA-Z_$]+)\s*=\s*"[^"]*"\s*,?\s*\n/g;
    sanitized = sanitized.replace(
      invalidPropertyPattern,
      (match, delimiter, whitespace, invalidProp, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Removed invalid property-like structure: ${invalidProp}=...`);
        }
        return `${delimiterStr}${whitespaceStr}`;
      },
    );

    // ===== Pattern 17: Remove truncated/explanatory text =====
    // Pattern: `},\nso many methods... I will stop here for brevity.\n  {` -> `},\n  {`
    // Also handles: `[]\n    },\nso many me"` -> `[]\n    },\n`
    const truncatedTextPattern =
      /([}\]])\s*,\s*\n\s*([a-z\s]{5,100}?)(?:\.\.\.|I will|stop here|for brevity|so many|methods|I'll|truncated)[^"]*\n\s*([{"])/gi;
    sanitized = sanitized.replace(
      truncatedTextPattern,
      (match, delimiter, strayText, nextToken, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const nextTokenStr = typeof nextToken === "string" ? nextToken : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";

        // Check if it's clearly explanatory/truncated text
        const isTruncatedText =
          /(so many|I will|stop here|for brevity|methods|I'll|truncated|\.\.\.)/i.test(
            strayTextStr,
          ) &&
          !strayTextStr.includes('"') &&
          !strayTextStr.includes("{") &&
          !strayTextStr.includes("}") &&
          !strayTextStr.includes("[") &&
          !strayTextStr.includes("]");

        if (isTruncatedText) {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed truncated/explanatory text: "${strayTextStr.substring(0, 50)}..."`,
            );
          }
          return `${delimiterStr},\n    ${nextTokenStr}`;
        }

        return match;
      },
    );

    // Pattern 17b: Handle truncated text at end of arrays/objects
    // Pattern: `[]\n    },\nso many me"` -> `[]\n    },\n`
    const truncatedTextAtEndPattern =
      /([}\]])\s*,\s*\n\s*([a-z\s]{5,50}?)(?:\.\.\.|I will|stop here|for brevity|so many|methods|I'll|truncated)[^"]*"([^"]*)"\s*,/gi;
    sanitized = sanitized.replace(
      truncatedTextAtEndPattern,
      (match, delimiter, strayText, stringValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const stringValueStr = typeof stringValue === "string" ? stringValue : "";

        const isTruncatedText =
          /(so many|I will|stop here|for brevity|methods|I'll|truncated|\.\.\.)/i.test(
            strayTextStr,
          );

        if (isTruncatedText) {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed truncated text and preserved string value: "${stringValueStr}"`,
            );
          }
          return `${delimiterStr},\n    "${stringValueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 18: Remove stray text/hostnames before property names =====
    // Pattern: `hp-probook-650-g8-notebook-pc"purpose":` -> `"purpose":`
    // Also handles: `tribulations"integrationPoints":` -> `"integrationPoints":`
    const hostnameBeforePropertyPattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z0-9\-_.]{10,100})"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    sanitized = sanitized.replace(
      hostnameBeforePropertyPattern,
      (match, delimiter, whitespace, hostname, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if it looks like a hostname or stray text (contains hyphens, dots, or is very long)
        const hostnameStr = typeof hostname === "string" ? hostname : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const looksLikeHostname =
          /^[a-zA-Z0-9\-_.]+$/.test(hostnameStr) &&
          (hostnameStr.includes("-") || hostnameStr.includes(".") || hostnameStr.length > 15);

        if (looksLikeHostname) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed hostname/stray text "${hostnameStr.substring(0, 30)}..." before property: "${propertyNameStr}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // ===== Pattern 19: Fix malformed property with backtick and colon =====
    // Pattern: `"name":`:toBe":` -> `"name": "toBe",`
    // Also handles: `"name":`:toBe": "value"` -> `"name": "toBe",`
    const malformedPropertyBacktickPattern =
      /"([^"]+)"\s*:\s*`:([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      malformedPropertyBacktickPattern,
      (match, propertyName, insertedWord, actualValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const insertedWordStr = typeof insertedWord === "string" ? insertedWord : "";
        const actualValueStr = typeof actualValue === "string" ? actualValue : "";

        // Check if this looks like a malformed property
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed malformed property with backtick: "${propertyNameStr}":\`${insertedWordStr}": "${actualValueStr}" -> "${propertyNameStr}": "${insertedWordStr}",`,
            );
          }
          // The actualValue appears to be orphaned, so we just fix the immediate issue
          return `"${propertyNameStr}": "${insertedWordStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 20: Fix missing opening quotes in string array elements =====
    // Pattern: `import lombok.RequiredArgsConstructor",` -> `"import lombok.RequiredArgsConstructor",`
    // Also handles: `fineract.infrastructure.event...",` -> `"fineract.infrastructure.event...",`
    // This pattern detects strings in arrays that are missing the opening quote
    // Improved to handle more cases including package names with dots
    // Updated to handle newlines before unquoted strings
    // Pattern requires newline to avoid matching single-line valid JSON
    const missingOpeningQuoteInArrayPattern =
      /((\s*\n|,\s*\n|\[\s*\n)(\s*))([a-zA-Z][a-zA-Z0-9_.]*[a-zA-Z0-9_])"\s*,/g;
    sanitized = sanitized.replace(
      missingOpeningQuoteInArrayPattern,
      (match, fullPrefix, _newlinePart, whitespace, stringValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);

        // Check if we're after a comma and newline (common in arrays)
        // This is the most reliable indicator - arrays in JSON are often formatted with newlines
        const isAfterCommaNewline = /,\s*\n/.test(beforeMatch);
        const isAfterArrayElement = /"\s*,\s*\n/.test(beforeMatch);
        const isAfterOpeningBracket = /\[\s*\n/.test(beforeMatch);

        // Check bracket depth for array context
        let bracketDepth = 0;
        let braceDepth = 0;
        let inString = false;
        let escape = false;
        let foundArrayContext = false;
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
                foundArrayContext = true;
                break;
              }
            } else if (char === "}") {
              braceDepth++;
            } else if (char === "{") {
              braceDepth--;
            }
          }
        }

        // Only apply the fix if we're in an array context
        // The pattern already requires a newline, so we can be more lenient with context checking
        // Also verify we're not matching already-quoted strings (check if there's a quote immediately before the string value)
        // The pattern matches unquoted strings, so check the character right before the string value starts
        const stringValueStart =
          numericOffset +
          (typeof fullPrefix === "string" ? fullPrefix.length : 0) +
          (typeof whitespace === "string" ? whitespace.length : 0);
        const charBeforeString = sanitized.charAt(stringValueStart - 1);
        const isAlreadyQuoted = charBeforeString === '"';

        if (
          !isAlreadyQuoted &&
          (foundArrayContext || isAfterCommaNewline || isAfterArrayElement || isAfterOpeningBracket)
        ) {
          hasChanges = true;
          const prefixStr = typeof fullPrefix === "string" ? fullPrefix : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          let stringValueStr = typeof stringValue === "string" ? stringValue : "";

          // If it starts with "fineract." and doesn't have "org.apache." prefix, add it
          if (
            stringValueStr.startsWith("fineract.") &&
            !stringValueStr.startsWith("org.apache.fineract.")
          ) {
            stringValueStr = `org.apache.${stringValueStr}`;
            if (diagnostics.length < 10) {
              diagnostics.push(
                `Fixed missing opening quote and org.apache prefix in array: ${stringValue}" -> "org.apache.${stringValue}"`,
              );
            }
          } else if (stringValueStr.startsWith("to.")) {
            // For "to.loan.transaction..." patterns, try to reconstruct from context
            const beforeContext = sanitized.substring(
              Math.max(0, numericOffset - 1000),
              numericOffset,
            );
            const previousPackageRegex =
              /"org\.apache\.fineract\.infrastructure\.event\.business\.domain\.loan\.transaction\.([^"]+)"/;
            const previousPackageMatch = previousPackageRegex.exec(beforeContext);
            if (previousPackageMatch) {
              const className = stringValueStr.replace(/^to\.loan\.transaction\./, "");
              stringValueStr = `org.apache.fineract.infrastructure.event.business.domain.loan.transaction.${className}`;
              if (diagnostics.length < 10) {
                diagnostics.push(
                  `Fixed missing opening quote and reconstructed package name: to.${className} -> org.apache.fineract.infrastructure.event.business.domain.loan.transaction.${className}`,
                );
              }
            } else {
              if (diagnostics.length < 10) {
                diagnostics.push(
                  `Fixed missing opening quote in array: ${stringValueStr}" -> "${stringValueStr}"`,
                );
              }
            }
          } else {
            if (diagnostics.length < 10) {
              diagnostics.push(
                `Fixed missing opening quote in array element: ${stringValueStr}" -> "${stringValueStr}"`,
              );
            }
          }
          return `${prefixStr}${whitespaceStr}"${stringValueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 21: Fix missing opening quotes with stray text before string in arrays =====
    // Pattern: `cv"org.apache.fineract...",` -> `"org.apache.fineract...",`
    // This handles cases where there's stray text (like "cv", "import", etc.) before a string missing its opening quote
    const strayTextBeforeMissingQuotePattern =
      /([[\s,]\s*)([a-z]{1,10})"([a-zA-Z][a-zA-Z0-9_.]*[a-zA-Z0-9_])"\s*,/g;
    sanitized = sanitized.replace(
      strayTextBeforeMissingQuotePattern,
      (match, prefix, strayText, stringValue, offset: unknown) => {
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
                // We're in an array context
                hasChanges = true;
                const prefixStr = typeof prefix === "string" ? prefix : "";
                const stringValueStr = typeof stringValue === "string" ? stringValue : "";
                const strayTextStr = typeof strayText === "string" ? strayText : "";
                if (diagnostics.length < 10) {
                  diagnostics.push(
                    `Removed stray text '${strayTextStr}' and fixed missing opening quote: ${strayTextStr}"${stringValueStr}" -> "${stringValueStr}"`,
                  );
                }
                return `${prefixStr}"${stringValueStr}",`;
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

    // ===== Pattern 22: Fix missing comma and quote for unquoted strings at end of array lines =====
    // Pattern: `"org.apache.poi.ss.usermodel.Workbook",\norg.junit.jupiter.api.Assertions"` ->
    //          `"org.apache.poi.ss.usermodel.Workbook",\n    "org.junit.jupiter.api.Assertions",`
    // This handles cases where a string in an array is missing both the comma before it and the opening quote
    const missingCommaAndQuotePattern =
      /("([^"]+)"\s*,?\s*\n\s*)([a-zA-Z][a-zA-Z0-9_.]*[a-zA-Z0-9_])"\s*,?\s*(\n|])/g;
    sanitized = sanitized.replace(
      missingCommaAndQuotePattern,
      (match, prefix, _prevValue, stringValue, terminator, offset: unknown) => {
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
                // We're in an array context
                hasChanges = true;
                const prefixStr = typeof prefix === "string" ? prefix : "";
                const stringValueStr = typeof stringValue === "string" ? stringValue : "";
                const terminatorStr = typeof terminator === "string" ? terminator : "";
                // Ensure there's a comma after the previous value if missing
                const prefixWithComma = prefixStr.trim().endsWith(",")
                  ? prefixStr
                  : prefixStr.replace(/"\s*$/, '",');
                if (diagnostics.length < 10) {
                  diagnostics.push(
                    `Fixed missing comma and quote: ${stringValueStr}" -> "${stringValueStr}",`,
                  );
                }
                return `${prefixWithComma}\n    "${stringValueStr}",${terminatorStr}`;
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

    // ===== Pattern 23: Fix typos in package names (tribur -> org, missing org.apache. prefix) =====
    // Pattern: `tribur.apache.fineract...` -> `"org.apache.fineract...`
    // Pattern: `fineract.portfolio.meeting...` -> `"org.apache.fineract.portfolio.meeting...`
    // Also handles missing opening quotes: `tribur.apache.fineract...",` -> `"org.apache.fineract...",`
    const typoPackagePattern =
      /([}\],]|\n|^)(\s*)(tribur|orgf|orgah)\.apache\.([a-zA-Z0-9_.]+)"\s*,/g;
    sanitized = sanitized.replace(
      typoPackagePattern,
      (match, delimiter, whitespace, typo, packagePath, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const packagePathStr = typeof packagePath === "string" ? packagePath : "";
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed typo in package name: ${typo}.apache.${packagePathStr} -> org.apache.${packagePathStr}`,
          );
        }
        return `${delimiterStr}${whitespaceStr}"org.apache.${packagePathStr}",`;
      },
    );

    // Pattern: Missing org.apache. prefix (fineract.portfolio... -> org.apache.fineract.portfolio...)
    // Also handles missing opening quotes: `fineract.portfolio.meeting...",` -> `"org.apache.fineract.portfolio.meeting...",`
    const missingOrgApachePrefixPattern = /([}\],]|\n|^)(\s*)(fineract\.[a-zA-Z0-9_.]+)"\s*,/g;
    sanitized = sanitized.replace(
      missingOrgApachePrefixPattern,
      (match, delimiter, whitespace, packagePath, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const packagePathStr = typeof packagePath === "string" ? packagePath : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing org.apache. prefix: ${packagePathStr} -> org.apache.${packagePathStr}`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"org.apache.${packagePathStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 24: Fix accented characters in package names =====
    // Pattern: `orgá.apache.fineract...` -> `org.apache.fineract...`
    const accentedCharPattern = /"org([áàâäéèêëíìîïóòôöúùûüñç])\.apache\.([a-zA-Z0-9_.]+)"/g;
    sanitized = sanitized.replace(
      accentedCharPattern,
      (match, accentedChar, packagePath, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const packagePathStr = typeof packagePath === "string" ? packagePath : "";
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed accented character in package name: org${accentedChar}.apache.${packagePathStr} -> org.apache.${packagePathStr}`,
          );
        }
        return `"org.apache.${packagePathStr}"`;
      },
    );

    // ===== Pattern 25: Fix stray single characters at start of lines in arrays =====
    // Pattern: `e    "org.apache.fineract...",` -> `    "org.apache.fineract...",`
    const strayCharAtLineStartPattern = /([}\],]|\n|^)(\s*)([a-z])\s+("([a-zA-Z0-9_.]+)")/g;
    sanitized = sanitized.replace(
      strayCharAtLineStartPattern,
      (match, delimiter, whitespace, strayChar, quotedString, _stringValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray && /^[a-z]$/.test(strayChar as string)) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const quotedStringStr = typeof quotedString === "string" ? quotedString : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray character '${strayChar as string}' before array element: ${strayChar as string} ${quotedStringStr}`,
            );
          }
          return `${delimiterStr}${whitespaceStr}${quotedStringStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 26: Fix truncated responses ending with ...] =====
    // Pattern: `...]` at end -> remove and close properly
    const truncatedEndPattern = /\.\.\.\s*\]\s*$/;
    sanitized = sanitized.replace(truncatedEndPattern, () => {
      hasChanges = true;
      if (diagnostics.length < 10) {
        diagnostics.push("Removed truncated ending ...]");
      }
      // Find the last proper closing bracket/brace before the truncation
      const beforeTruncation = sanitized.substring(0, sanitized.length - 4); // Remove "...]"
      const lastBracket = beforeTruncation.lastIndexOf("]");
      const lastBrace = beforeTruncation.lastIndexOf("}");
      // Find the last opening bracket/brace to determine what needs to be closed
      const lastOpenBracket = beforeTruncation.lastIndexOf("[");
      const lastOpenBrace = beforeTruncation.lastIndexOf("{");

      // If we have an unclosed bracket or brace, close it
      if (lastOpenBracket > lastBracket) {
        return "]";
      } else if (lastOpenBrace > lastBrace) {
        return "}";
      }
      // Otherwise, just remove the truncation marker
      return "";
    });

    // ===== Pattern 27: Fix malformed property values =====
    // Pattern: `"name":a": "value"` -> `"name": "a",` or `"name": "value"` (depending on context)
    const malformedPropertyValuePattern =
      /"([^"]+)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      malformedPropertyValuePattern,
      (match, propertyName, _insertedWord, actualValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const actualValueStr = typeof actualValue === "string" ? actualValue : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed malformed property value: "${propertyNameStr}":...": "${actualValueStr}" -> "${propertyNameStr}": "${actualValueStr}"`,
            );
          }
          return `"${propertyNameStr}": "${actualValueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 28: Remove placeholder text like _INSERT_DATABASE_INTEGRATION_ =====
    // Pattern: `_INSERT_DATABASE_INTEGRATION_` -> remove (placeholder that wasn't replaced)
    const placeholderPattern = /([}\],]|\n|^)(\s*)_[A-Z_]+_(\s*)([}\],]|\n|$)/g;
    sanitized = sanitized.replace(
      placeholderPattern,
      (match, before, _whitespace, placeholder, _whitespaceAfter, after, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const beforeStr = typeof before === "string" ? before : "";
        const afterStr = typeof after === "string" ? after : "";
        const placeholderStr = typeof placeholder === "string" ? placeholder : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Removed placeholder text: ${placeholderStr}`);
        }

        // If there's a comma before, keep it; otherwise just return the delimiters
        if (beforeStr.includes(",")) {
          return `${beforeStr}\n${afterStr}`;
        }
        return `${beforeStr}${afterStr}`;
      },
    );

    // ===== Pattern 29: Remove Python-style triple quotes =====
    // Pattern: `extra_text="""` or `"""` -> remove (Python-style string delimiters, not JSON)
    const pythonTripleQuotesPattern = /([}\],]|\n|^)(\s*)(extra_[a-zA-Z_$]+\s*=\s*)?"(""|""")/g;
    sanitized = sanitized.replace(
      pythonTripleQuotesPattern,
      (match, delimiter, whitespace, _extraText, _quotes, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        if (diagnostics.length < 10) {
          diagnostics.push("Removed Python-style triple quotes");
        }
        return `${delimiterStr}${whitespaceStr}`;
      },
    );

    // Also handle triple quotes at the end of the JSON
    sanitized = sanitized.replace(/"(""|""")\s*$/g, () => {
      hasChanges = true;
      if (diagnostics.length < 10) {
        diagnostics.push("Removed Python-style triple quotes at end");
      }
      return "";
    });

    // ===== Pattern 30: Remove stray text after closing brace =====
    // Pattern: `}tribal-council-assistant-v1-final-answer` -> `}`
    // Also handles: `}\nstray-text` -> `}`
    const strayTextAfterBracePattern = /([}])\s*([a-zA-Z0-9\-_]{5,100})(\s*)$/g;
    sanitized = sanitized.replace(
      strayTextAfterBracePattern,
      (match, brace, strayText, _whitespace, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if this is at the end of the JSON (last closing brace)
        const afterMatch = sanitized.substring(numericOffset + match.length);
        if (afterMatch.trim().length === 0) {
          hasChanges = true;
          const braceStr = typeof brace === "string" ? brace : "";
          const strayTextStr = typeof strayText === "string" ? strayText : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed stray text after closing brace: ${strayTextStr}`);
          }
          return braceStr;
        }

        return match;
      },
    );

    // ===== Pattern 31: Fix missing comma and opening quote before array items =====
    // Pattern: `]tribus.data.TransactionProcessingStrategyData"` -> `], "org.apache.fineract.portfolio.transaction.data.TransactionProcessingStrategyData"`
    // Or: `]tribus.data.TransactionProcessingStrategyData"` -> `], "tribus.data.TransactionProcessingStrategyData"`
    const missingCommaAndQuoteBeforeArrayItemPattern =
      /([}\],])\s*\n\s*([a-z]+)\.([a-z]+)\.([a-z.]+)"\s*,?\s*\n/g;
    sanitized = sanitized.replace(
      missingCommaAndQuoteBeforeArrayItemPattern,
      (match, delimiter, prefix, middle, suffix, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray = /\[\s*$/.test(beforeMatch) || /,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const fullPath = `${prefix}.${middle}.${suffix}`;
          if (diagnostics.length < 10) {
            diagnostics.push(`Fixed missing comma and quote before array item: ${fullPath}`);
          }
          return `${delimiterStr},\n    "${fullPath}",\n`;
        }

        return match;
      },
    );

    // ===== Pattern 32: Fix truncated property names =====
    // Pattern: `se": "This test validates...` -> `"name": "This test validates...`
    // Also handles: `ce": "final String"` -> `"name": "final String"`
    const truncatedPropertyNamePattern = /([}\],]|\n|^)(\s*)([a-z]{1,3})"\s*:\s*"([^"]{20,})/g;
    sanitized = sanitized.replace(
      truncatedPropertyNamePattern,
      (match, delimiter, whitespace, truncated, valueStart, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if this looks like a truncated property name followed by a long value
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        // Common property names that might be truncated
        const propertyMap: Record<string, string> = {
          se: "name",
          ce: "name",
          me: "name",
          pu: "purpose",
          de: "description",
          pa: "parameters",
          re: "returnType",
        };

        const truncatedStr = typeof truncated === "string" ? truncated : "";
        const fullProperty = propertyMap[truncatedStr] || "name";

        if (isPropertyContext && fullProperty) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const valueStartStr = typeof valueStart === "string" ? valueStart : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Fixed truncated property name: ${truncated}" -> "${fullProperty}"`);
          }
          return `${delimiterStr}${whitespaceStr}"${fullProperty}": "${valueStartStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 33: Remove extra closing brackets =====
    // Pattern: Multiple `]` characters that shouldn't be there
    // Example: `      ]\n      ]\n      ]\n      ]\n    }` -> `    }`
    const extraClosingBracketsPattern = /([}\]])\s*\n\s*(\]\s*\n\s*){2,}([}\]]|$)/g;
    sanitized = sanitized.replace(
      extraClosingBracketsPattern,
      (match, before, _brackets, after, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context (not inside a string)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isInArray = /\[\s*$/.test(beforeMatch);

        // Only remove if we're NOT in an array (where brackets are valid)
        if (!isInArray) {
          hasChanges = true;
          const beforeStr = typeof before === "string" ? before : "";
          const afterStr = typeof after === "string" ? after : "";
          if (diagnostics.length < 10) {
            diagnostics.push("Removed extra closing brackets");
          }
          return `${beforeStr}\n${afterStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 34: Fix malformed property with extra colon/quote =====
    // Pattern: `{"name":g": "isPreMatureClosure"` -> `{"name": "isPreMatureClosure"`
    // Also handles: `{"name":toBe": "value"` -> `{"name": "value"`
    const malformedPropertyColonQuotePattern2 = /"([^"]+)"\s*:\s*([a-z]{1,10})"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      malformedPropertyColonQuotePattern2,
      (match, propertyName, insertedWord, actualValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const actualValueStr = typeof actualValue === "string" ? actualValue : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed malformed property: "${propertyNameStr}":${insertedWord}": "${actualValueStr}" -> "${propertyNameStr}": "${actualValueStr}"`,
            );
          }
          return `"${propertyNameStr}": "${actualValueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 35: Fix missing opening quote on property names =====
    // Pattern: `cyclomaticComplexity": 1,` -> `"cyclomaticComplexity": 1,`
    // Also handles: `name": "value"` -> `"name": "value"`
    const missingOpeningQuoteOnPropertyPattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([^,}\]]+)/g;
    sanitized = sanitized.replace(
      missingOpeningQuoteOnPropertyPattern,
      (match, delimiter, whitespace, propertyName, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing opening quote: ${propertyNameStr}" -> "${propertyNameStr}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}": ${valueStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 36: Fix stray single character before property name =====
    // Pattern: `c"name": "hasError"` -> `"name": "hasError"`
    // Also handles: `e      "mechanism": "REST"` -> `      "mechanism": "REST"`
    const strayCharBeforePropertyPattern2 =
      /([}\],]|\n|^)(\s*)([a-z])\s*("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g;
    sanitized = sanitized.replace(
      strayCharBeforePropertyPattern2,
      (
        match,
        delimiter,
        whitespace,
        strayChar,
        propertyWithQuote,
        _propertyName,
        offset: unknown,
      ) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isValidContext =
          /[}\],]\s*$/.test(beforeMatch) || /^\s*$/.test(beforeMatch) || numericOffset < 100;

        if (isValidContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyWithQuoteStr =
            typeof propertyWithQuote === "string" ? propertyWithQuote : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed stray character '${strayChar}' before property`);
          }
          return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 37: Fix markdown list markers before property names =====
    // Pattern: `* "purpose":` -> `"purpose":`
    const markdownListMarkerPattern = /([}\],]|\n|^)(\s*)\*\s*("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g;
    sanitized = sanitized.replace(
      markdownListMarkerPattern,
      (match, delimiter, whitespace, propertyWithQuote, _propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isValidContext =
          /[}\],]\s*$/.test(beforeMatch) || /^\s*$/.test(beforeMatch) || numericOffset < 100;

        if (isValidContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyWithQuoteStr =
            typeof propertyWithQuote === "string" ? propertyWithQuote : "";
          if (diagnostics.length < 10) {
            diagnostics.push("Removed markdown list marker (*) before property");
          }
          return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 38: Fix typo "orgain" -> "org" in package names =====
    // Pattern: `"orgain.apache.fineract...` -> `"org.apache.fineract...`
    const orgainTypoPattern = /"orgain\.apache\.([a-zA-Z0-9_.]+)"/g;
    sanitized = sanitized.replace(orgainTypoPattern, (match, packagePath, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }

      hasChanges = true;
      const packagePathStr = typeof packagePath === "string" ? packagePath : "";
      if (diagnostics.length < 10) {
        diagnostics.push(
          `Fixed typo in package name: orgain.apache.${packagePathStr} -> org.apache.${packagePathStr}`,
        );
      }
      return `"org.apache.${packagePathStr}"`;
    });

    // ===== Pattern 39: Remove minus signs before array elements =====
    // Pattern: `-"org.apache.fineract...",` -> `"org.apache.fineract...",`
    const minusSignBeforeArrayElementPattern = /([}\],]|\n|^)(\s*)-\s*("([^"]+)"\s*,)/g;
    sanitized = sanitized.replace(
      minusSignBeforeArrayElementPattern,
      (match, delimiter, whitespace, quotedElement, _elementValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const quotedElementStr = typeof quotedElement === "string" ? quotedElement : "";
          if (diagnostics.length < 10) {
            diagnostics.push("Removed minus sign before array element");
          }
          return `${delimiterStr}${whitespaceStr}${quotedElementStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 40: Fix missing quotes on property names (codeSmells: -> "codeSmells":) =====
    // Pattern: `codeSmells: [` -> `"codeSmells": [`
    const missingQuotesOnPropertyPattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(\[|{)/g;
    sanitized = sanitized.replace(
      missingQuotesOnPropertyPattern,
      (match, delimiter, whitespace, propertyName, valueStart, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStartStr = typeof valueStart === "string" ? valueStart : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing quotes on property: ${propertyNameStr}: -> "${propertyNameStr}":`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}": ${valueStartStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 41: Fix malformed property with extra colon/quote =====
    // Pattern: `"name":g": "value"` -> `"name": "value"`
    // Also handles: `"name":toBe": "value"` -> `"name": "toBe",` (if toBe looks like a value)
    const malformedPropertyExtraColonPattern = /"([^"]+)"\s*:\s*([a-z]{1,10})"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      malformedPropertyExtraColonPattern,
      (match, propertyName, insertedWord, actualValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const actualValueStr = typeof actualValue === "string" ? actualValue : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed malformed property: "${propertyNameStr}":${insertedWord}": "${actualValueStr}" -> "${propertyNameStr}": "${actualValueStr}"`,
            );
          }
          return `"${propertyNameStr}": "${actualValueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 42: Remove truncated/explanatory text after final closing brace =====
    // Pattern: `}\nthere are more methods, but the response is too long. I will stop here.` -> `}`
    const truncatedTextAfterFinalBracePattern =
      /(})\s*\n\s*([a-z\s]{10,200}?)(?:\.\.\.|I will|stop here|for brevity|so many|methods|I'll|truncated|there are|but the response)[^}]*$/i;
    sanitized = sanitized.replace(
      truncatedTextAfterFinalBracePattern,
      (match, closingBrace, strayText, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if this is at the end of the JSON (last closing brace)
        const afterMatch = sanitized.substring(numericOffset + match.length);
        if (afterMatch.trim().length === 0) {
          const strayTextStr = typeof strayText === "string" ? strayText : "";
          const isTruncatedText =
            /(so many|I will|stop here|for brevity|methods|I'll|truncated|there are|but the response|\.\.\.)/i.test(
              strayTextStr,
            ) &&
            !strayTextStr.includes('"') &&
            !strayTextStr.includes("{") &&
            !strayTextStr.includes("}") &&
            !strayTextStr.includes("[") &&
            !strayTextStr.includes("]");

          if (isTruncatedText) {
            hasChanges = true;
            if (diagnostics.length < 10) {
              diagnostics.push(
                `Removed truncated/explanatory text after final closing brace: "${strayTextStr.substring(0, 50)}..."`,
              );
            }
            const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "}";
            return closingBraceStr;
          }
        }

        return match;
      },
    );

    // ===== Pattern 13: Remove asterisk before property names =====
    // Pattern: `* "purpose":` -> `"purpose":`
    // This handles markdown list item markers that shouldn't be in JSON
    const asteriskBeforePropertyPattern =
      /([}\],]|\n|^)(\s*)\*\s+("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g;
    sanitized = sanitized.replace(
      asteriskBeforePropertyPattern,
      (match, delimiter, whitespace, propertyWithQuote, _propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isValidContext =
          /[}\],]\s*$/.test(beforeMatch) ||
          /^\s*$/.test(beforeMatch) ||
          numericOffset < 200 ||
          /,\s*\n\s*$/.test(beforeMatch);

        if (isValidContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyWithQuoteStr =
            typeof propertyWithQuote === "string" ? propertyWithQuote : "";
          if (diagnostics.length < 10) {
            diagnostics.push("Removed asterisk before property name");
          }
          return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 14: Remove stray dashes after commas/array delimiters =====
    // Pattern: `],-` -> `],` or `,-` -> `,`
    const strayDashPattern = /([}\],])\s*-\s*([,}\]]|\n|$)/g;
    sanitized = sanitized.replace(strayDashPattern, (match, delimiter, after, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }

      const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
      const isValidContext =
        /[}\],]\s*$/.test(beforeMatch) || /^\s*$/.test(beforeMatch) || numericOffset < 100;

      if (isValidContext) {
        hasChanges = true;
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const afterStr = typeof after === "string" ? after : "";
        if (diagnostics.length < 10) {
          diagnostics.push("Removed stray dash after delimiter");
        }
        return `${delimiterStr}${afterStr}`;
      }

      return match;
    });

    // ===== Pattern 15: Fix missing colons after property names =====
    // Pattern: `"type" "JsonCommand"` -> `"type": "JsonCommand"`
    const missingColonPattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s+"([^"]+)"/g;
    sanitized = sanitized.replace(
      missingColonPattern,
      (match, propertyName, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if this looks like a property name followed by a value (not two array elements)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /:\s*{\s*$/.test(beforeMatch);

        // Make sure we're not in an array context (where two quoted strings would be array elements)
        let isInArrayContext = false;
        if (!isPropertyContext) {
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
                  isInArrayContext = true;
                  break;
                }
              } else if (char === "}") {
                braceDepth++;
              } else if (char === "{") {
                braceDepth--;
              }
            }
          }
        }

        if (isPropertyContext && !isInArrayContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing colon: "${propertyNameStr}" "${valueStr}" -> "${propertyNameStr}": "${valueStr}"`,
            );
          }
          return `"${propertyNameStr}": "${valueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 16: Fix typos in property names like "name":a": =====
    // Pattern: `"name":a": "command"` -> `"name": "command"`
    const typoInPropertyNamePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([a-z])"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      typoInPropertyNamePattern,
      (match, propertyName, typoChar, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /:\s*{\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed typo in property name: "${propertyNameStr}":${typoChar}": "${valueStr}" -> "${propertyNameStr}": "${valueStr}"`,
            );
          }
          return `"${propertyNameStr}": "${valueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 43: Fix stray text "stop" before string values in arrays =====
    // Pattern: `stop"org.apache.commons.lang3.BooleanUtils",` -> `"org.apache.commons.lang3.BooleanUtils",`
    const stopBeforeStringPattern = /([}\],]|\n|^)(\s*)stop"([^"]+)"\s*,/g;
    sanitized = sanitized.replace(
      stopBeforeStringPattern,
      (match, delimiter, whitespace, stringValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const stringValueStr = typeof stringValue === "string" ? stringValue : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed 'stop' before array element: "${stringValueStr.substring(0, 30)}..."`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${stringValueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 44: Fix stray characters at end of string values =====
    // Pattern: `"GroupGeneralData>"` -> `"GroupGeneralData"`
    // Also handles: `"value>"`, `"value]"`, `"value}"` etc.
    const strayCharAtEndOfStringPattern = /"([^"]+)([>\]}])(\s*[,}\]]|\s*\n)/g;
    sanitized = sanitized.replace(
      strayCharAtEndOfStringPattern,
      (match, stringValue, strayChar, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context (property value or array element)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isValueContext =
          /:\s*$/.test(beforeMatch) || /,\s*$/.test(beforeMatch) || /\[\s*$/.test(beforeMatch);

        if (isValueContext) {
          hasChanges = true;
          const stringValueStr = typeof stringValue === "string" ? stringValue : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray character '${strayChar}' at end of string value: "${stringValueStr}"`,
            );
          }
          return `"${stringValueStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 45: Fix stray single characters on their own lines =====
    // Pattern: `    g\n    {` -> `    {`
    // Also handles: `    g\n    "property":`
    const strayCharOnOwnLinePattern = /([}\],]|\n|^)(\s+)([a-z])\s*\n\s*([{"])/g;
    sanitized = sanitized.replace(
      strayCharOnOwnLinePattern,
      (match, delimiter, whitespace, strayChar, nextToken, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isValidContext =
          /[}\],]\s*$/.test(beforeMatch) ||
          /^\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch);

        if (isValidContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const nextTokenStr = typeof nextToken === "string" ? nextToken : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed stray character '${strayChar}' on its own line`);
          }
          return `${delimiterStr}${whitespaceStr}${nextTokenStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 46: Fix missing opening quotes and commas before strings =====
    // Pattern: `Src/main/java/...",` -> `"Src/main/java/...",`
    // Also handles: `namespace": "org.apache..."` -> `"namespace": "org.apache..."`
    const missingQuoteAndCommaBeforeStringPattern =
      /([}\],]|\n|^)(\s*)([A-Z][a-zA-Z0-9_./]+)"\s*,/g;
    sanitized = sanitized.replace(
      missingQuoteAndCommaBeforeStringPattern,
      (match, delimiter, whitespace, stringValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const stringValueStr = typeof stringValue === "string" ? stringValue : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing opening quote before array element: ${stringValueStr}" -> "${stringValueStr}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${stringValueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 47: Fix malformed property names with spaces/extra chars =====
    // Pattern: `"name A": "uriInfo"` -> `"name": "uriInfo"`
    // Also handles: `"name A":`, `"property B":`
    const malformedPropertyNameWithSpacePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)\s+[A-Z]"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      malformedPropertyNameWithSpacePattern,
      (match, propertyName, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed malformed property name with space: "${propertyNameStr} A": -> "${propertyNameStr}":`,
            );
          }
          return `"${propertyNameStr}": "${valueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 48: Fix non-ASCII characters in string values =====
    // Pattern: `"org.apache.fineract.interoperation একজন.data.InteropQuoteRequestData"` ->
    //          `"org.apache.fineract.interoperation.data.InteropQuoteRequestData"`
    // This removes non-ASCII characters that appear in package names or other identifiers
    // eslint-disable-next-line no-control-regex
    const nonAsciiInStringValuePattern = /"([^"]*)([^\x00-\x7F]+)([^"]*)"/g;
    sanitized = sanitized.replace(
      nonAsciiInStringValuePattern,
      (match, before, _nonAscii, after, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if this looks like a package name or identifier (contains dots)
        const beforeStr = typeof before === "string" ? before : "";
        const afterStr = typeof after === "string" ? after : "";
        const looksLikeIdentifier = beforeStr.includes(".") || afterStr.includes(".");

        if (looksLikeIdentifier) {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed non-ASCII characters from identifier: "${beforeStr}...${afterStr}"`,
            );
          }
          return `"${beforeStr}${afterStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 49: Fix malformed property structures =====
    // Pattern: `{"name": a": "groupId"` -> `{"name": "groupId"`
    // Also handles: `{"name": a": "String"` -> `{"name": "String"`
    const malformedPropertyStructurePattern = /"([^"]+)"\s*:\s*([a-z])"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      malformedPropertyStructurePattern,
      (match, propertyName, strayChar, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed malformed property structure: "${propertyNameStr}": ${strayChar}": "${valueStr}" -> "${propertyNameStr}": "${valueStr}"`,
            );
          }
          return `"${propertyNameStr}": "${valueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 50: Fix stray text after array elements =====
    // Pattern: `"org.apache.fineract...",\nwhich_is_implemented_by_this_class",` ->
    //          `"org.apache.fineract...",`
    const strayTextAfterArrayElementPattern = /"([^"]+)"\s*,\s*\n\s*([a-z_]+)"\s*,/g;
    sanitized = sanitized.replace(
      strayTextAfterArrayElementPattern,
      (match, value, strayText, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        // Check if stray text looks like explanatory text (contains underscores, is not a valid identifier)
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const looksLikeExplanatoryText =
          strayTextStr.includes("_") && !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(strayTextStr);

        if (isInArray && looksLikeExplanatoryText) {
          hasChanges = true;
          const valueStr = typeof value === "string" ? value : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray explanatory text after array element: "${valueStr}" + "${strayTextStr}"`,
            );
          }
          return `"${valueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 51: Fix explanatory text breaking JSON structure =====
    // Pattern: `},\nthere are more methods, but the response is getting too long. I will stop here.\n    {` ->
    //          `},\n    {`
    const explanatoryTextBreakingJsonPattern =
      /([}\]])\s*,\s*\n\s*(there are|but the response|getting too long|I will stop|I'll stop|for brevity)[^}]*\n\s*([{"])/gi;
    sanitized = sanitized.replace(
      explanatoryTextBreakingJsonPattern,
      (match, delimiter, _explanatoryStart, nextToken, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const nextTokenStr = typeof nextToken === "string" ? nextToken : "";
        if (diagnostics.length < 10) {
          diagnostics.push("Removed explanatory text breaking JSON structure");
        }
        return `${delimiterStr},\n    ${nextTokenStr}`;
      },
    );

    // ===== Pattern 52: Fix stray characters before closing braces =====
    // Pattern: `s    },` -> `    },`
    // Also handles: `e    },`, `a    },`, etc.
    const strayCharBeforeClosingBracePattern = /([}\],]|\n|^)(\s+)([a-z])\s+([}])/g;
    sanitized = sanitized.replace(
      strayCharBeforeClosingBracePattern,
      (match, delimiter, whitespace, strayChar, closingBrace, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context (after property value or array element)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isValidContext =
          /"\s*$/.test(beforeMatch) ||
          /,\s*$/.test(beforeMatch) ||
          /]\s*$/.test(beforeMatch) ||
          /}\s*$/.test(beforeMatch) ||
          /:\s*[^"]+$/.test(beforeMatch);

        if (isValidContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const closingBraceStr = typeof closingBrace === "string" ? closingBrace : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed stray character '${strayChar}' before closing brace`);
          }
          return `${delimiterStr}${whitespaceStr}${closingBraceStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 53: Fix missing opening quotes with stray text before strings in arrays =====
    // Pattern: `body.fineract.portfolio...",` -> `"org.apache.fineract.portfolio...",`
    // Also handles: `semver "lombok...",` -> `"lombok...",`
    // Pattern: `body.` or `semver ` followed by a string (with or without opening quote)
    const missingQuoteWithStrayTextPattern =
      /([}\],]|\n|^)(\s*)(body\.|semver\s+)([a-zA-Z][a-zA-Z0-9_.]*)"\s*,/g;
    sanitized = sanitized.replace(
      missingQuoteWithStrayTextPattern,
      (match, delimiter, whitespace, strayPrefix, stringValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const stringValueStr = typeof stringValue === "string" ? stringValue : "";
          const strayPrefixStr = typeof strayPrefix === "string" ? strayPrefix : "";

          // If it's "body.fineract..." try to fix it to "org.apache.fineract..."
          let fixedValue = stringValueStr;
          if (strayPrefixStr.startsWith("body.") && stringValueStr.startsWith("fineract.")) {
            fixedValue = `org.apache.${stringValueStr}`;
          }

          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray text '${strayPrefixStr.trim()}' and fixed missing opening quote: ${strayPrefixStr}${stringValueStr}" -> "${fixedValue}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${fixedValue}",`;
        }

        return match;
      },
    );

    // Pattern 53b: Handle stray text before already-quoted strings
    // Pattern: `semver "lombok...",` -> `"lombok...",`
    const strayTextBeforeQuotedStringPattern = /([}\],]|\n|^)(\s*)(semver|body\.)\s+"([^"]+)"\s*,/g;
    sanitized = sanitized.replace(
      strayTextBeforeQuotedStringPattern,
      (match, delimiter, whitespace, strayPrefix, stringValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArray =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const stringValueStr = typeof stringValue === "string" ? stringValue : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray text '${strayPrefix}' before quoted string: "${stringValueStr.substring(0, 30)}..."`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${stringValueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 54: Fix missing property names =====
    // Pattern: `ce": "REST"` -> `"mechanism": "REST"`
    // Also handles: `ce": "String"` -> `"type": "String"` (context-dependent)
    const missingPropertyNamePattern = /([}\],]|\n|^)(\s*)([a-z]{1,3})"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      missingPropertyNamePattern,
      (match, delimiter, whitespace, fragment, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context (after comma, newline, or opening brace)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 300), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          const fragmentStr = typeof fragment === "string" ? fragment : "";
          const valueStr = typeof value === "string" ? value : "";

          // Try to infer the property name from context
          // Look at nearby properties to guess what this should be
          let inferredProperty = "name"; // default
          if (valueStr === "REST" || valueStr === "HTTP" || valueStr === "SOAP") {
            inferredProperty = "mechanism";
          } else if (
            valueStr === "String" ||
            valueStr === "Long" ||
            valueStr === "Integer" ||
            valueStr === "Boolean"
          ) {
            inferredProperty = "type";
          } else if (fragmentStr === "ce" && valueStr.length > 10) {
            // "ce" might be a fragment of "mechanism" or "name"
            inferredProperty = "mechanism";
          }

          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing property name: ${fragmentStr}" -> "${inferredProperty}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${inferredProperty}": "${valueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 55: Fix stray characters in property values =====
    // Pattern: `"currentUser",_ "type":` -> `"currentUser",`
    // Also handles: `"value",_` -> `"value",`
    const strayCharInPropertyValuePattern = /"([^"]+)"\s*,\s*_(\s*"[a-zA-Z_$][a-zA-Z0-9_$]*"\s*:)/g;
    sanitized = sanitized.replace(
      strayCharInPropertyValuePattern,
      (match, value, nextProperty, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array or object context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isInArrayOrObject =
          /\[\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch) ||
          /{\s*$/.test(beforeMatch);

        if (isInArrayOrObject) {
          hasChanges = true;
          const valueStr = typeof value === "string" ? value : "";
          const nextPropertyStr = typeof nextProperty === "string" ? nextProperty : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed stray underscore after property value: "${valueStr}",_`);
          }
          return `"${valueStr}",${nextPropertyStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 56: Fix missing quotes around property names in objects =====
    // Pattern: `name: "undoLoanDisbursal"` -> `"name": "undoLoanDisbursal"`
    // Also handles: `type: "JsonCommand"` -> `"type": "JsonCommand"`
    const missingQuotesOnPropertyNamePattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      missingQuotesOnPropertyNamePattern,
      (match, delimiter, whitespace, propertyName, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context (not in an array of strings)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch);

        // Make sure we're not in an array of strings
        let isInArrayOfStrings = false;
        if (!isPropertyContext) {
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
                  isInArrayOfStrings = true;
                  break;
                }
              } else if (char === "}") {
                braceDepth++;
              } else if (char === "{") {
                braceDepth--;
              }
            }
          }
        }

        if (isPropertyContext && !isInArrayOfStrings) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing quotes on property name: ${propertyNameStr}: -> "${propertyNameStr}":`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}": "${valueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 57: Fix missing quotes around property values =====
    // Pattern: `type": "JsonCommand"` -> `"type": "JsonCommand"`
    // This handles cases where the property name has a quote but the value doesn't
    const missingQuotesOnPropertyValuePattern =
      /([}\],]|\n|^)(\s*)"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_.]+)"\s*([,}])/g;
    sanitized = sanitized.replace(
      missingQuotesOnPropertyValuePattern,
      (match, delimiter, whitespace, propertyName, value, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch);

        const valueStr = typeof value === "string" ? value : "";
        const jsonKeywords = ["true", "false", "null"];
        if (jsonKeywords.includes(valueStr.toLowerCase())) {
          return match;
        }

        // Check if it's a number
        if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(valueStr)) {
          return match;
        }

        if (isPropertyContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing quotes on property value: "${propertyNameStr}":${valueStr}" -> "${propertyNameStr}": "${valueStr}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}": "${valueStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 58: Fix stray characters before property names =====
    // Pattern: `e"xternalReferences":` -> `"externalReferences":`
    // Also handles: `a"publicConstants":` -> `"publicConstants":`
    const strayCharBeforePropertyNamePattern =
      /([}\],]|\n|^)(\s*)([a-z])"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    sanitized = sanitized.replace(
      strayCharBeforePropertyNamePattern,
      (match, delimiter, whitespace, strayChar, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray character '${strayChar}' before property name: ${strayChar}"${propertyNameStr}" -> "${propertyNameStr}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // ===== Pattern 59: Fix stray characters in property names =====
    // Pattern: `"name":cha:` -> `"name":`
    // Also handles: `"name":toBe":` -> `"name":`
    const strayCharInPropertyNamePattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([a-z]{1,10})"\s*:/g;
    sanitized = sanitized.replace(
      strayCharInPropertyNamePattern,
      (match, propertyName, strayText, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const strayTextStr = typeof strayText === "string" ? strayText : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray text '${strayTextStr}' in property name: "${propertyNameStr}":${strayTextStr}": -> "${propertyNameStr}":`,
            );
          }
          return `"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // ===== Pattern 60: Fix malformed property syntax like `{- "name"` =====
    // Pattern: `{- "name":` -> `{ "name":`
    // This handles cases where there's a missing quote before the opening brace
    const malformedPropertyStartPattern = /\{-\s*"([^"]+)"\s*:/g;
    sanitized = sanitized.replace(
      malformedPropertyStartPattern,
      (match, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed malformed property start: {- "${propertyNameStr}" -> { "${propertyNameStr}"`,
          );
        }
        return `{ "${propertyNameStr}":`;
      },
    );

    // ===== Pattern 61: Fix missing quotes on property names with string values like `name: "value"` =====
    // Pattern: `name: "value"` -> `"name": "value"`
    // This handles cases where both quotes are missing around the property name and the value is a string
    // Note: Pattern 40 already handles missing quotes when followed by [ or {
    const missingQuotesOnPropertyWithStringPattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      missingQuotesOnPropertyWithStringPattern,
      (match, delimiter, whitespace, propertyName, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";

          // Skip if it's a JSON keyword
          const jsonKeywords = ["true", "false", "null", "undefined"];
          if (!jsonKeywords.includes(propertyNameStr.toLowerCase())) {
            hasChanges = true;
            if (diagnostics.length < 10) {
              diagnostics.push(
                `Fixed missing quotes on property: ${propertyNameStr}: "${valueStr}" -> "${propertyNameStr}": "${valueStr}"`,
              );
            }
            return `${delimiterStr}${whitespaceStr}"${propertyNameStr}": "${valueStr}"`;
          }
        }

        return match;
      },
    );

    // ===== Pattern 62: Fix truncated text patterns with markers like `cyclomaticComplexity: 1,_OF_CODE` =====
    // Pattern: `property: value,_OF_CODE` -> `property: value,`
    // This handles cases where text is truncated with patterns like `_OF_CODE`, `_CODE`, etc.
    // Note: Pattern 17 already handles general truncated text like "so many methods..."
    const truncatedTextMarkerPattern = /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*([^,}]+),(_[A-Z_]+)/g;
    sanitized = sanitized.replace(
      truncatedTextMarkerPattern,
      (match, propertyName, value, truncationMarker, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          const truncationMarkerStr = typeof truncationMarker === "string" ? truncationMarker : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed truncation marker: ${propertyNameStr}: ${valueStr},${truncationMarkerStr} -> ${propertyNameStr}: ${valueStr},`,
            );
          }
          return `${propertyNameStr}: ${valueStr},`;
        }

        return match;
      },
    );

    // ===== Pattern 64: Fix string arrays instead of actual arrays =====
    // Pattern: `"parameters": "[]"` -> `"parameters": []`
    // This handles cases where an array is represented as a string instead of an actual array
    const stringArrayPattern = /"([^"]+)"\s*:\s*"(\[\])"/g;
    sanitized = sanitized.replace(
      stringArrayPattern,
      (match, propertyName, _arrayString, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed string array to actual array: "${propertyNameStr}": "[]" -> "${propertyNameStr}": []`,
            );
          }
          return `"${propertyNameStr}": []`;
        }

        return match;
      },
    );

    // ===== Pattern 66: Fix malformed property names with extra characters =====
    // Pattern: `"name":sem":` -> `"name":`
    // Pattern: `"name":sem": "value"` -> `"name": "value"`
    // This handles cases where property names have extra characters like ":sem": inserted
    const malformedPropertyNamePattern = /"([^"]+)":([a-z]{1,5})":\s*("?[^"]*"?)/g;
    sanitized = sanitized.replace(
      malformedPropertyNamePattern,
      (match, propertyName, extraText, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const extraTextStr = typeof extraText === "string" ? extraText : "";
          const valueStr = typeof value === "string" ? value : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed malformed property name: "${propertyNameStr}":${extraTextStr}": -> "${propertyNameStr}":`,
            );
          }
          return `"${propertyNameStr}": ${valueStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 67: Fix stray text patterns =====
    // Pattern: `{.json` -> `{`
    const strayJsonPattern = /\{\.json(\s*\n|\s*$)/g;
    sanitized = sanitized.replace(strayJsonPattern, (match, newlineOrSpace, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }
      hasChanges = true;
      if (diagnostics.length < 10) {
        diagnostics.push("Fixed {.json -> {");
      }
      // Preserve the whitespace/newline after {.json
      const newlineOrSpaceStr = typeof newlineOrSpace === "string" ? newlineOrSpace : "";
      return `{${newlineOrSpaceStr}`;
    });

    // Pattern: `trib` -> remove (stray text)
    // Pattern: `cmethod` -> remove (stray text)
    // Pattern: `e"publicConstants"` -> remove (stray text)
    // Pattern: `tribal-council-leader-thought` -> remove (stray text)
    const strayTextPattern =
      /([}\],]|\n|^)(\s*)(trib|cmethod|e"publicConstants"|tribal-council-leader-thought)(\s*)([}\],]|\n|$)/g;
    sanitized = sanitized.replace(
      strayTextPattern,
      (match, before, _whitespace, strayText, _whitespaceAfter, after, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }
        hasChanges = true;
        const beforeStr = typeof before === "string" ? before : "";
        const afterStr = typeof after === "string" ? after : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Removed stray text '${strayTextStr}'`);
        }
        return `${beforeStr}${afterStr}`;
      },
    );

    // Pattern: `_ADDITIONAL_PROPERTIES` -> remove (stray text)
    const underscoreStrayPattern = /([}\],]|\n|^)(\s*)(_[A-Z_]+)(\s*)([}\],]|\n|$)/g;
    sanitized = sanitized.replace(
      underscoreStrayPattern,
      (match, before, _whitespace, strayText, _whitespaceAfter, after, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }
        hasChanges = true;
        const beforeStr = typeof before === "string" ? before : "";
        const afterStr = typeof after === "string" ? after : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Removed stray text '${strayTextStr}'`);
        }
        return `${beforeStr}${afterStr}`;
      },
    );

    // Pattern: `returnType": "void",_` -> `returnType": "void",`
    const trailingUnderscorePattern = /("([^"]+)":\s*"([^"]+)",)\s*_(\s*[}\],]|\s*\n)/g;
    sanitized = sanitized.replace(
      trailingUnderscorePattern,
      (match, propertyValue, _propertyName, _value, after, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }
        hasChanges = true;
        const propertyValueStr = typeof propertyValue === "string" ? propertyValue : "";
        const afterStr = typeof after === "string" ? after : "";
        if (diagnostics.length < 10) {
          diagnostics.push("Removed trailing underscore after property value");
        }
        return `${propertyValueStr}${afterStr}`;
      },
    );

    // ===== Pattern 67.5: Remove trailing commas =====
    // Pattern: `"key": "value",}` -> `"key": "value"}`
    // Pattern: `"item",]` -> `"item"]`
    // This handles trailing commas before closing braces or brackets (invalid in strict JSON)
    const trailingCommaPattern = /,\s*([}\]])/g;
    sanitized = sanitized.replace(
      trailingCommaPattern,
      (match, closingDelimiter, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }
        hasChanges = true;
        const closingDelimiterStr = typeof closingDelimiter === "string" ? closingDelimiter : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Removed trailing comma before ${closingDelimiterStr}`);
        }
        return closingDelimiterStr;
      },
    );

    // ===== Pattern 68: Fix missing opening quote before property values =====
    // Pattern: `post": "jakarta.ws.rs.POST"` -> `"post": "jakarta.ws.rs.POST"`
    // Also handles: `"post": "jakarta.ws.rs.POST"` in arrays -> `"jakarta.ws.rs.POST"` (just the value)
    // This handles cases where property names are missing the opening quote
    // Also handles cases in arrays where property-like structures appear (even if quote was already added)
    const missingOpeningQuoteBeforePropertyPattern =
      /([}\],]|\n|^)(\s*)("?)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"([^"]+)"/g;

    sanitized = sanitized.replace(
      missingOpeningQuoteBeforePropertyPattern,
      (match, delimiter, whitespace, optionalQuote, propertyName, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;

        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context (object) or array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const hasQuote = optionalQuote === '"';

        // Check bracket/brace depth to determine if we're in an array or object
        let bracketDepth = 0;
        let braceDepth = 0;
        let inString = false;
        let escape = false;
        let lastOpeningBracket = -1;
        let lastOpeningBrace = -1;
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
              if (bracketDepth < 0 && lastOpeningBracket === -1) {
                lastOpeningBracket = i;
              }
            } else if (char === "}") {
              braceDepth++;
            } else if (char === "{") {
              braceDepth--;
              if (braceDepth < 0 && lastOpeningBrace === -1) {
                lastOpeningBrace = i;
              }
            }
          }
        }

        // We're in an array if:
        // 1. We found an opening bracket and it's more recent than any opening brace
        // 2. OR we're after a quoted string with comma (array element pattern)
        const isInArray =
          (lastOpeningBracket > lastOpeningBrace && bracketDepth < 0) || // In array, not object
          (/"\s*$/.test(beforeMatch) && delimiterStr === "," && bracketDepth < braceDepth); // After array element

        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          isInArray; // Also match in arrays

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";

          // If we're in an array, convert to just the value (arrays can't have key-value pairs)
          if (isInArray) {
            if (diagnostics.length < 10) {
              diagnostics.push(
                `Fixed property in array context: "${propertyNameStr}": "${valueStr}" -> "${valueStr}"`,
              );
            }
            return `${delimiterStr}${whitespaceStr}"${valueStr}"`;
          }

          // In object context, ensure the property name has a quote
          if (!hasQuote) {
            if (diagnostics.length < 10) {
              diagnostics.push(
                `Fixed missing opening quote before property: ${propertyNameStr}": -> "${propertyNameStr}":`,
              );
            }
            return `${delimiterStr}${whitespaceStr}"${propertyNameStr}": "${valueStr}"`;
          }

          // Quote already present, just return as-is
          return match;
        }

        return match;
      },
    );

    // ===== Pattern 69: Fix duplicate import statements embedded in JSON =====
    // Pattern: Remove duplicate Java import statements that appear in JSON
    // This handles cases where the LLM includes actual Java code in the JSON response
    // Match package statement followed by one or more import statements
    const duplicateImportPattern = /(package\s+[a-zA-Z0-9_.]+;\s*\n(?:\s*import\s+[^;]+;\s*\n)+)/g;
    sanitized = sanitized.replace(duplicateImportPattern, (match, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }

      // Check if this is inside a string value (shouldn't be removed if it's part of a string)
      const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
      const afterMatch = sanitized.substring(
        numericOffset + match.length,
        numericOffset + match.length + 100,
      );

      // If it's between quotes, it's part of a string value, don't remove
      if (/"[^"]*$/.test(beforeMatch) && /^[^"]*"/.test(afterMatch)) {
        return match;
      }

      hasChanges = true;
      if (diagnostics.length < 10) {
        diagnostics.push("Removed duplicate import statements embedded in JSON");
      }
      return "";
    });

    // ===== Pattern 70: Fix missing dots in package names (orgfineract -> org.apache.fineract) =====
    // Pattern: `orgfineract` -> `org.apache.fineract`
    // This handles cases where "org.apache" is merged into "orgfineract"
    const missingDotInOrgFineractPattern = /"orgfineract\.([a-zA-Z0-9_.]+)"/g;
    sanitized = sanitized.replace(
      missingDotInOrgFineractPattern,
      (match, packagePath, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const packagePathStr = typeof packagePath === "string" ? packagePath : "";
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed missing dots in package: orgfineract.${packagePathStr} -> org.apache.fineract.${packagePathStr}`,
          );
        }
        return `"org.apache.fineract.${packagePathStr}"`;
      },
    );

    // ===== Pattern 71: Fix stray text like "trib" at end of property =====
    // Pattern: `"externalReferences": [\n...],\ntrib` -> `"externalReferences": [\n...],`
    const strayTextAtEndPattern = /([}\],])\s*\n\s*(trib[a-z-]*)(\s*)([}\],]|\n|$)/g;
    sanitized = sanitized.replace(
      strayTextAtEndPattern,
      (match, delimiter, strayText, _whitespace, after, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const afterStr = typeof after === "string" ? after : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Removed stray text '${strayText}' after ${delimiterStr}`);
        }
        return `${delimiterStr}\n${afterStr}`;
      },
    );

    // ===== Pattern 72: Fix missing opening quote for strings starting with "to." =====
    // Pattern: `to.loan.transaction...",` -> `"to.loan.transaction...",`
    // This is a specific case for package-like strings missing quotes
    const missingQuoteToPattern = /([}\],]|\n|^)(\s*)(to\.[a-zA-Z0-9_.]+)"\s*,/g;
    sanitized = sanitized.replace(
      missingQuoteToPattern,
      (match, delimiter, whitespace, unquotedValue, offset: unknown) => {
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
                hasChanges = true;
                const delimiterStr = typeof delimiter === "string" ? delimiter : "";
                const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
                const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";
                if (diagnostics.length < 10) {
                  diagnostics.push(
                    `Fixed missing opening quote: ${unquotedValueStr}" -> "${unquotedValueStr}"`,
                  );
                }
                return `${delimiterStr}${whitespaceStr}"${unquotedValueStr}",`;
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

    // ===== Pattern 73: Fix hyphens instead of dots in package names =====
    // Pattern: `jakarta.ws-rs.Path` -> `jakarta.ws.rs.Path`
    // This handles cases where hyphens are used instead of dots in package names
    const hyphenInPackagePattern = /"([a-zA-Z0-9_.]+)-([a-zA-Z0-9_]+)\.([a-zA-Z0-9_.]+)"/g;
    sanitized = sanitized.replace(
      hyphenInPackagePattern,
      (match, before, hyphenated, after, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Only fix if it looks like a package name (before has a dot, indicating it's a package)
        const beforeStr = typeof before === "string" ? before : "";
        const afterStr = typeof after === "string" ? after : "";
        // Check if before has a dot (package-like) OR if after has a dot (also package-like)
        if (beforeStr.includes(".") || afterStr.includes(".")) {
          hasChanges = true;
          const hyphenatedStr = typeof hyphenated === "string" ? hyphenated : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed hyphen in package name: ${beforeStr}-${hyphenatedStr}.${afterStr} -> ${beforeStr}.${hyphenatedStr}.${afterStr}`,
            );
          }
          return `"${beforeStr}.${hyphenatedStr}.${afterStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 74: Fix missing opening quote before property name =====
    // Pattern: `- "externalReferences"` -> `"externalReferences"`
    // Pattern: `name":` -> `"name":`
    // Pattern: `se":` -> `"purpose":` (common truncation of "purpose")
    // This handles cases where property names are missing the opening quote
    // First handle the case where there's a dash and quote before the property name
    const dashQuotePropertyPattern = /([}\],]|\n|^)(\s*)-\s*"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    sanitized = sanitized.replace(
      dashQuotePropertyPattern,
      (match, delimiter, whitespace, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        // The delimiter might be part of the match, so check context before the delimiter
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const delimiterRegex = /[}\],]/;
        const contextStart = delimiterRegex.test(delimiterStr)
          ? Math.max(0, numericOffset - delimiterStr.length - 300)
          : Math.max(0, numericOffset - 200);
        const beforeMatch = sanitized.substring(contextStart, numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*$/.test(beforeMatch); // Also match after closing bracket

        if (isPropertyContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed dash and quote before property: - "${propertyNameStr}": -> "${propertyNameStr}":`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // Then handle the case where the property name is missing the opening quote
    // Also handles cases where the quote is already present (from Pattern 68) but we need to fix truncations
    const missingQuoteBeforePropertyNamePattern =
      /([}\],]|\n|^)(\s*)("?)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    sanitized = sanitized.replace(
      missingQuoteBeforePropertyNamePattern,
      (match, delimiter, whitespace, optionalQuote, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        // Check for property context: after { or , (with optional whitespace/newline)
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /[{,]\s*\n\s*$/.test(beforeMatch) || // Also match after { or , with newline
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          let propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const hasQuote = optionalQuote === '"';

          // Fix common truncations (regardless of whether quote is present)
          if (propertyNameStr === "se") {
            // "se" is likely a truncation of "purpose"
            propertyNameStr = "purpose";
            if (diagnostics.length < 10) {
              diagnostics.push('Fixed truncated property name: "se": -> "purpose":');
            }
            return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
          }

          // If quote is missing, add it
          if (!hasQuote) {
            if (diagnostics.length < 10) {
              diagnostics.push(
                `Fixed missing opening quote before property: ${propertyNameStr}": -> "${propertyNameStr}":`,
              );
            }
            return `${delimiterStr}${whitespaceStr}"${propertyNameStr}":`;
          }

          // Quote already present and no truncation to fix, return as-is
          return match;
        }

        return match;
      },
    );

    // ===== Pattern 54: Fix malformed parameter objects with corrupted property names =====
    // Pattern: Fixes cases like `"name":toBeContinued": "value"` -> `"name": "toBeContinued"`
    // This handles cases where a property name got corrupted and merged with the value
    // The pattern matches: "name":toBeContinued": "true" where "toBeContinued" is the actual value
    const malformedParameterPattern =
      /"([^"]+)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      malformedParameterPattern,
      (match, propertyName, unquotedValue, quotedValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";
        const quotedValueStr = typeof quotedValue === "string" ? quotedValue : "";
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed malformed parameter object: "${propertyNameStr}":${unquotedValueStr}": "${quotedValueStr}" -> "${propertyNameStr}": "${unquotedValueStr}"`,
          );
        }
        // The unquoted value (toBeContinued) is the actual value, ignore the quoted value
        return `"${propertyNameStr}": "${unquotedValueStr}"`;
      },
    );

    // ===== Pattern 65: Fix missing quotes on property names followed by numeric or boolean values =====
    // Pattern: `linesOfCode: 14,` -> `"linesOfCode": 14,`
    // Also handles: `cyclomaticComplexity: 1,` -> `"cyclomaticComplexity": 1,`
    const missingQuotesOnPropertyWithNumericPattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:\s*(\d+|true|false|null)(\s*[,}])/g;
    sanitized = sanitized.replace(
      missingQuotesOnPropertyWithNumericPattern,
      (match, delimiter, whitespace, propertyName, value, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing quotes on property: ${propertyNameStr}: ${valueStr} -> "${propertyNameStr}": ${valueStr}`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${propertyNameStr}": ${valueStr}${terminatorStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 66: Fix duplicated property names like cyclcyclomaticComplexity =====
    // Pattern: `cyclcyclomaticComplexity` -> `cyclomaticComplexity`
    // Also handles: `returnreturnType` -> `returnType`, `namename` -> `name`
    const duplicatedPropertyNamePattern = /"([a-zA-Z_$]+)\1([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    sanitized = sanitized.replace(
      duplicatedPropertyNamePattern,
      (match, duplicatedPrefix, rest, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const duplicatedPrefixStr = typeof duplicatedPrefix === "string" ? duplicatedPrefix : "";
          const restStr = typeof rest === "string" ? rest : "";
          const fixedName = `${duplicatedPrefixStr}${restStr}`;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed duplicated property name: "${duplicatedPrefixStr}${duplicatedPrefixStr}${restStr}" -> "${fixedName}"`,
            );
          }
          return `"${fixedName}":`;
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== input;

    if (!hasChanges) {
      return { content: input, changed: false };
    }

    return {
      content: sanitized,
      changed: true,
      description: "Fixed malformed JSON patterns",
      diagnostics: diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    console.warn(`fixMalformedJsonPatterns sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
