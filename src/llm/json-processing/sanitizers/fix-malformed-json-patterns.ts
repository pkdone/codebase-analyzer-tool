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
    const strayTextAfterBracePattern = /([}\]])\s*,\s*([a-z]{1,5})(\s*[}\]]|\s*\n\s*[{"])/g;
    sanitized = sanitized.replace(
      strayTextAfterBracePattern,
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
