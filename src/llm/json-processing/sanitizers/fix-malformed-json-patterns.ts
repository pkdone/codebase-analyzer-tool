import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { logOneLineWarning } from "../../../common/utils/logging";
import { isInStringAt } from "../utils/parser-context-utils";

/**
 * Sanitizer that fixes various malformed JSON patterns found in LLM responses.
 *
 * This sanitizer handles:
 * 1. Extra single characters before properties (like `a  "propertyName":`, `s  "anotherProperty":`, `e "property":`, `c{`)
 * 2. Corrupted property values (like `"propertyName":_CODE`4,`)
 * 3. Invalid property names (like `extra_code_analysis:`)
 * 4. Duplicate closing braces at the end
 * 5. Missing quotes on property names (like `name":` instead of `"name":`)
 * 6. Non-ASCII characters in string values that break JSON parsing
 * 7. Malformed JSON structures and stray text
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
      // Check if there are obvious errors that need fixing (malformed structures, stray text, etc.)
      const hasObviousErrors =
        /"[^"]+\s+[a-zA-Z]+\s*":|<x_bin_\d+|[\u0080-\uFFFF]|_[A-Z_]+\s*=\s*"/i.test(input);
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

    // ===== Pattern 1: Fix corrupted entries like _MODULE" =====

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

    // ===== Pattern 2b: Remove stray single characters before quoted strings in arrays =====
    // Pattern: `e"org.apache...` -> `"org.apache...`
    // This handles cases where a single lowercase letter appears directly before a quoted string
    // Handles both with and without newlines: `,e"string",` or `,\ne"string",`
    const strayCharBeforeQuotePattern = /([,[]\s*\n?\s*)([a-z])("([^"]+)"\s*,)/g;
    sanitized = sanitized.replace(
      strayCharBeforeQuotePattern,
      (match, prefix, strayChar, quotedString, _stringValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context (after comma, bracket, newline, or start)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isArrayContext =
          /[,[]\s*$/.test(beforeMatch) ||
          /,\s*\n\s*$/.test(beforeMatch) ||
          /^\s*$/.test(beforeMatch) ||
          numericOffset < 100;

        if (isArrayContext) {
          hasChanges = true;
          const prefixStr = typeof prefix === "string" ? prefix : "";
          const quotedStringStr = typeof quotedString === "string" ? quotedString : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray character '${strayChar}' before quoted string in array`,
            );
          }
          // Preserve the delimiter and whitespace from prefix, but remove the stray char
          const cleanPrefix = prefixStr.replace(/\s*$/, ""); // Remove trailing whitespace
          return `${cleanPrefix}\n    ${quotedStringStr}`;
        }

        return match;
      },
    );

    // Pattern: Fix missing property name with single character before quote (run early)
    // Pattern: `y"name":` -> `"name":` or `{y"name":` -> `{"name":`
    const singleCharBeforePropertyQuoteEarlyPattern =
      /([{,]\s*)([a-z])"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    sanitized = sanitized.replace(
      singleCharBeforePropertyQuoteEarlyPattern,
      (match, prefix, extraChar, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const prefixStr = typeof prefix === "string" ? prefix : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Removed extra character '${extraChar}' before property name "${propertyNameStr}"`,
          );
        }
        return `${prefixStr}"${propertyNameStr}":`;
      },
    );

    // Pattern: Remove 'ar' prefix before quoted strings in arrays (run early)
    // Pattern: `ar"stringValue"` -> `"stringValue"`
    const arPrefixEarlyPattern = /([}\],]|\n|^)(\s*)ar"([^"]+)"(\s*,|\s*\])/g;
    sanitized = sanitized.replace(
      arPrefixEarlyPattern,
      (match, delimiter, whitespace, stringValue, terminator, offset: unknown) => {
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
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed 'ar' prefix before quoted string: "${stringValueStr.substring(0, 30)}..."`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${stringValueStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern: Fix missing property name with underscore fragment after opening brace (run early)
    // Pattern: `{_PARAM_TABLE": "table"` -> `{"name": "PARAM_TABLE"`
    const missingPropertyNameWithBraceEarlyPattern = /\{\s*([_][A-Z_]+)"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      missingPropertyNameWithBraceEarlyPattern,
      (match, fragment, _value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const fragmentStr = typeof fragment === "string" ? fragment : "";
        const fixedValue = fragmentStr.substring(1); // Remove leading underscore

        hasChanges = true;
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed missing property name with fragment: {${fragmentStr}" -> {"name": "${fixedValue}"`,
          );
        }
        return `{"name": "${fixedValue}"`;
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

    // Pattern: Remove bullet points before property names
    // Pattern: `•  "publicConstants":` -> `"publicConstants":`
    const bulletPointBeforePropertyPattern =
      /([}\],]|\n|^)(\s*)•\s+("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g;
    sanitized = sanitized.replace(
      bulletPointBeforePropertyPattern,
      (match, delimiter, whitespace, propertyWithQuote, _propertyName, offset: unknown) => {
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
          const propertyWithQuoteStr =
            typeof propertyWithQuote === "string" ? propertyWithQuote : "";
          if (diagnostics.length < 10) {
            diagnostics.push("Removed bullet point before property name");
          }
          return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
        }

        return match;
      },
    );

    // Pattern: Fix missing opening quote on property name (starts with colon and quote)
    // Pattern: `": "value"` -> `"name": "value"`
    const missingPropertyNameBeforeColonPattern = /(\n\s+)"\s*:\s*"([^"]{20,})"/g;
    // Also handle case without newline: `  ": "This is...`
    const missingPropertyNameBeforeColonPattern2 = /([{,]\s+)"\s*:\s*"([^"]{20,})"/g;
    sanitized = sanitized.replace(
      missingPropertyNameBeforeColonPattern2,
      (match, prefix, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          const inferredProperty = "name"; // Generic default
          const valueStr = typeof value === "string" ? value : "";

          hasChanges = true;
          const prefixStr = typeof prefix === "string" ? prefix : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing property name before colon: ": -> "${inferredProperty}":`,
            );
          }
          return `${prefixStr}"${inferredProperty}": "${valueStr}"`;
        }

        return match;
      },
    );
    sanitized = sanitized.replace(
      missingPropertyNameBeforeColonPattern,
      (match, prefix, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          const inferredProperty = "name"; // Generic default
          const valueStr = typeof value === "string" ? value : "";

          hasChanges = true;
          const prefixStr = typeof prefix === "string" ? prefix : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing property name before colon: ": -> "${inferredProperty}":`,
            );
          }
          return `${prefixStr}"${inferredProperty}": "${valueStr}"`;
        }

        return match;
      },
    );

    // Pattern: Remove stray text before property names
    // Pattern: `stray text    "propertyName":` -> `"propertyName":`
    const strayTextBeforePropertyPattern =
      /([}\],]|\n|^)(\s*)([a-z][a-z\s]{10,}?)\s+("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g;
    sanitized = sanitized.replace(
      strayTextBeforePropertyPattern,
      (
        match,
        delimiter,
        whitespace,
        strayText,
        propertyWithQuote,
        _propertyName,
        offset: unknown,
      ) => {
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
          const propertyWithQuoteStr =
            typeof propertyWithQuote === "string" ? propertyWithQuote : "";
          const strayTextStr = typeof strayText === "string" ? strayText : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed stray text '${strayTextStr.trim()}' before property`);
          }
          return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
        }

        return match;
      },
    );

    // Pattern: Fix corrupted property names: `"name":g": "value"` -> `"name": "value"`
    // Also handles: `"name":aus":` -> `"name":`
    const corruptedPropertyNamePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*([a-zA-Z]+)\s*":(\s*[,}])/g;
    sanitized = sanitized.replace(
      corruptedPropertyNamePattern,
      (match, propertyName, extraText, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed corrupted property name: "${propertyNameStr}":${extraText}": -> "${propertyNameStr}":`,
          );
        }
        return `"${propertyNameStr}":${terminatorStr}`;
      },
    );

    // ===== Pattern 3: Fix corrupted property values =====
    // Pattern: `"propertyName":_CODE`4,` -> `"propertyName": 4,`
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
    // Pattern: `strayText"stringValue",` -> `"stringValue",`
    // Also handles single characters like `t    "stringValue"` in arrays
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

    // ===== Pattern 12b: Remove single stray character before string values in arrays =====
    // Pattern: `t    "stringValue",` -> `"stringValue",`
    // This handles cases where a single character appears before a quoted string in an array
    // The pattern matches: newline + single char + whitespace + quoted string (the comma is on the previous line)
    const singleStrayCharBeforeArrayStringPattern = /(\n)([a-z])(\s+)"([^"]+)"\s*(,|\])/g;
    sanitized = sanitized.replace(
      singleStrayCharBeforeArrayStringPattern,
      (match, newline, strayChar, whitespace, stringValue, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context by scanning backwards
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        let bracketDepth = 0;
        let braceDepth = 0;
        let inString = false;
        let escape = false;
        let foundArray = false;

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

        // Also check if the previous line ends with a comma (common in arrays)
        const isAfterComma = /,\s*$/.test(beforeMatch.trimEnd());

        if (foundArray || isAfterComma) {
          hasChanges = true;
          const newlineStr = typeof newline === "string" ? newline : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const stringValueStr = typeof stringValue === "string" ? stringValue : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          const strayCharStr = typeof strayChar === "string" ? strayChar : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed single stray character '${strayCharStr}' before array element: "${stringValueStr.substring(0, 30)}..."`,
            );
          }
          return `${newlineStr}${whitespaceStr}"${stringValueStr}"${terminatorStr}`;
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

    // ===== Pattern 50: Add missing comma after array when extra_text: appears =====
    // Pattern: `]\n    extra_text:` -> `],\n    extra_text:`
    // This handles cases where an array ends without a comma and extra_text: appears next
    // Must run BEFORE Pattern 16 which removes extra_text patterns
    const missingCommaAfterArrayExtraTextPattern =
      /(\])\s*\n\s*(extra_text|extra_thoughts|extra_code_analysis)\s*:/g;
    sanitized = sanitized.replace(
      missingCommaAfterArrayExtraTextPattern,
      (match, closingBracket, extraText, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // The pattern already ensures we're matching ] followed by extra_text, so this is always valid
        hasChanges = true;
        const closingBracketStr = typeof closingBracket === "string" ? closingBracket : "";
        const extraTextStr = typeof extraText === "string" ? extraText : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Added missing comma after array before ${extraTextStr}:`);
        }
        return `${closingBracketStr},\n    ${extraTextStr}:`;
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

    // ===== Pattern 16b: Remove YAML-like blocks embedded in JSON =====
    // Pattern: `semantically-similar-code-detection-results:\n  - score: 0.98\n  ...` -> remove entire block
    // This handles cases where LLM inserts YAML-like metadata blocks in the middle of JSON
    // Also handles single-line YAML-like entries: `extra_thoughts: I've identified all...`
    const yamlBlockPattern =
      /(\n\s*)(semantically-similar-code-detection-results|extra_thoughts|extra_code_analysis|extra_notes|extra_info):\s*([\s\S]*?)(?=\n\s*"[a-zA-Z]|\n\s*[}\]]|$)/gi;
    sanitized = sanitized.replace(
      yamlBlockPattern,
      (match, newlinePrefix, blockName, _blockContent, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const newlinePrefixStr = typeof newlinePrefix === "string" ? newlinePrefix : "";
        const blockNameStr = typeof blockName === "string" ? blockName : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Removed YAML-like block: ${blockNameStr}:`);
        }
        return newlinePrefixStr;
      },
    );

    // ===== Pattern 16c: Remove extra_text= style attributes embedded in JSON =====
    // Pattern: `extra_text="  "externalReferences": [` -> remove the extra_text= part
    // This handles cases where LLM wraps valid JSON in an extra_text= attribute
    const extraTextEqualPattern =
      /(\n\s*)(extra_text|extra_info|extra_notes)\s*=\s*"(\s*"[a-zA-Z])/gi;
    sanitized = sanitized.replace(
      extraTextEqualPattern,
      (match, newlinePrefix, _attrName, jsonStart, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const newlinePrefixStr = typeof newlinePrefix === "string" ? newlinePrefix : "";
        const jsonStartStr = typeof jsonStart === "string" ? jsonStart : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Removed extra_text= wrapper around JSON`);
        }
        return newlinePrefixStr + jsonStartStr;
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
    // Pattern: `hostname"propertyName":` -> `"propertyName":`
    // Also handles: `strayText"propertyName":` -> `"propertyName":`
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
    // Pattern: `unquotedStringValue",` -> `"unquotedStringValue",`
    // Handles cases where strings in arrays are missing their opening quote
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
          const stringValueStr = typeof stringValue === "string" ? stringValue : "";

          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing opening quote in array element: ${stringValueStr}" -> "${stringValueStr}"`,
            );
          }
          return `${prefixStr}${whitespaceStr}"${stringValueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 21: Fix missing opening quotes with stray text before string in arrays =====
    // Pattern: `cv"stringValue",` -> `"stringValue",`
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
    // Pattern: `"stringValue",\nunquotedString"` -> `"stringValue",\n    "unquotedString",`
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

    // ===== Pattern 25: Fix stray single characters at start of lines in arrays =====
    // Pattern: `e    "stringValue",` -> `    "stringValue",`
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
    // Note: asteriskBeforePropertyPattern is already defined earlier, so we skip duplicate declaration
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
    // Pattern: `]unquoted.string.value"` -> `], "unquoted.string.value"`
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

        // Use a generic default property name for truncated names
        const fullProperty = "name"; // Generic default for truncated property names

        if (isPropertyContext) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const valueStartStr = typeof valueStart === "string" ? valueStart : "";
          const truncatedStr = typeof truncated === "string" ? truncated : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed truncated property name: ${truncatedStr}" -> "${fullProperty}"`,
            );
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
    // Pattern: `propertyName": value` -> `"propertyName": value`
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

    // ===== Pattern 39: Remove minus signs before array elements =====
    // Pattern: `-"stringValue",` -> `"stringValue",`
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

    // ===== Pattern 40: Fix missing quotes on property names =====
    // Pattern: `propertyName: [` -> `"propertyName": [`
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
    // Pattern: `* "propertyName":` -> `"propertyName":`
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
    // Also handles: `"name "command",` -> `"name": "command",` (space before closing quote)
    const missingColonPattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s+"([^"]+)"/g;
    // Also handle space before closing quote: `"name "value"` -> `"name": "value"`
    const missingColonWithSpacePattern = /"([a-zA-Z_$][a-zA-Z0-9_$]*)\s+"([^"]+)"(\s*[,}])/g;
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

    // Also handle missing colon with space before closing quote: `"name "value"` -> `"name": "value"`
    sanitized = sanitized.replace(
      missingColonWithSpacePattern,
      (match, propertyName, value, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if this looks like a property name followed by a value
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /:\s*{\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing colon: "${propertyNameStr} "value" -> "${propertyNameStr}": "value"`,
            );
          }
          return `"${propertyNameStr}": "${valueStr}"${terminatorStr}`;
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
    // Pattern: `stop"stringValue",` -> `"stringValue",`
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
    // Pattern: `UnquotedStringValue",` -> `"UnquotedStringValue",`
    // Handles cases where strings in arrays are missing opening quotes
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
    // Pattern: `"propertyName A": "value"` -> `"propertyName": "value"`
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
    // Pattern: `"stringValueWithNonASCII"` -> `"stringValueWithoutNonASCII"`
    // This removes non-ASCII characters that appear in identifiers or package-like strings
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
    // Pattern: `"stringValue",\nstrayText",` -> `"stringValue",`
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
    // Pattern: `strayPrefix.stringValue",` -> `"stringValue",`
    // Handles cases where stray text appears before a string missing its opening quote
    const missingQuoteWithStrayTextPattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z][a-zA-Z0-9_.]*\.)([a-zA-Z][a-zA-Z0-9_.]*)"\s*,/g;
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

          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray text '${strayPrefixStr.trim()}' and fixed missing opening quote: ${strayPrefixStr}${stringValueStr}" -> "${stringValueStr}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${stringValueStr}",`;
        }

        return match;
      },
    );

    // Pattern 53b: Handle stray text before already-quoted strings
    // Pattern: `strayPrefix "stringValue",` -> `"stringValue",`
    // Note: 'ar' prefix is handled earlier in the pipeline
    const strayTextBeforeQuotedStringPattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z][a-zA-Z0-9_.]*\s+)"([^"]+)"\s*,/g;
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
    // Pattern: `ce": "value"` -> `"name": "value"`
    // Also handles: `{_PARAM_TABLE":` -> `{"name": "PARAM_TABLE":`
    const missingPropertyNamePattern = /([}\],]|\n|^)(\s*)([a-z]{1,3}|_[A-Z_]+)"\s*:\s*"([^"]+)"/g;
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

          // Use a generic default property name
          const inferredProperty = "name"; // default
          if (fragmentStr.startsWith("_") && fragmentStr.length > 1) {
            // Handle cases like `_PARAM_TABLE"` -> `"name": "PARAM_TABLE"`
            const fixedValue = fragmentStr.substring(1); // Remove leading underscore
            hasChanges = true;
            const delimiterStr = typeof delimiter === "string" ? delimiter : "";
            const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
            if (diagnostics.length < 10) {
              diagnostics.push(
                `Fixed missing property name with fragment: ${fragmentStr}" -> "${inferredProperty}": "${fixedValue}"`,
              );
            }
            return `${delimiterStr}${whitespaceStr}"${inferredProperty}": "${fixedValue}"`;
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

    // ===== Pattern 62: Fix truncated text patterns with markers =====
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
    // Pattern: `propertyName": "value"` -> `"propertyName": "value"`
    // Also handles property-like structures in arrays -> converts to just the value
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

    // ===== Pattern 71: Fix stray text like "trib" at end of property =====
    // Pattern: `"propertyName": [\n...],\ntrib` -> `"propertyName": [\n...],`
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

    // ===== Pattern 74: Fix missing opening quote before property name =====
    // Pattern: `- "propertyName"` -> `"propertyName"`
    // Pattern: `propertyName":` -> `"propertyName":`
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
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const hasQuote = optionalQuote === '"';

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
    // Pattern: `propertyName: 14,` -> `"propertyName": 14,`
    // Also handles: `propertyName: true,` -> `"propertyName": true,`
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

    // ===== Pattern 66: Fix duplicated property names =====
    // Pattern: `prefixprefixPropertyName` -> `prefixPropertyName`
    // Handles cases where a property name prefix is duplicated
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

    // ===== Pattern 75: Remove asterisks before property names (enhanced) =====
    // Pattern: `* "propertyName":` -> `"propertyName":`
    // Handles cases where LLM adds asterisks before property names
    // This is an enhanced version that handles cases Pattern 13 might miss (single space after asterisk)
    const asteriskBeforePropertyPattern75 = /(\n\s*)\*\s("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g;
    sanitized = sanitized.replace(
      asteriskBeforePropertyPattern75,
      (match, prefix, propertyWithQuote, _propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context (after a comma, closing brace, or newline)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /]\s*,\s*\n\s*$/.test(beforeMatch) ||
          /"\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          hasChanges = true;
          const prefixStr = typeof prefix === "string" ? prefix : "";
          const propertyWithQuoteStr =
            typeof propertyWithQuote === "string" ? propertyWithQuote : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed asterisk before property: * ${propertyWithQuoteStr}`);
          }
          return `${prefixStr}${propertyWithQuoteStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 76: Fix missing opening quote on property values (enhanced) =====
    // Pattern: `"type":JsonCommand"` -> `"type": "JsonCommand"`
    // Pattern: `"name":gsimId"` -> `"name": "gsimId"`
    const missingQuoteOnValuePattern76 = /"([^"]+)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$]*)"(\s*[,}])/g;
    sanitized = sanitized.replace(
      missingQuoteOnValuePattern76,
      (match, propertyName, value, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        hasChanges = true;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const valueStr = typeof value === "string" ? value : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed missing opening quote on value: "${propertyNameStr}":${valueStr}" -> "${propertyNameStr}": "${valueStr}"`,
          );
        }
        return `"${propertyNameStr}": "${valueStr}"${terminatorStr}`;
      },
    );

    // ===== Pattern 78: Fix corrupted property assignments =====
    // Pattern: `"name":alue": "LocalDate"` -> `"name": "transferDate", "type": "LocalDate"`
    // This is a more specific case where a property name got corrupted
    const corruptedAssignmentPattern78 = /"([^"]+)"\s*:\s*([a-zA-Z]+)"\s*:\s*"([^"]+)"/g;
    sanitized = sanitized.replace(
      corruptedAssignmentPattern78,
      (match, propertyName, corruptedPart, value, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if corruptedPart looks like it could be part of a property name
        // Common patterns: "alue" (from "value"), "ame" (from "name"), etc.
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const corruptedPartStr = typeof corruptedPart === "string" ? corruptedPart : "";
        const valueStr = typeof value === "string" ? value : "";

        // If corruptedPart is "alue" and propertyName is "name", it's likely "name":alue": "value"
        // We should fix it to "name": "value" (assuming the corrupted part is just noise)
        if (corruptedPartStr.length <= 5 && /^[a-z]+$/.test(corruptedPartStr)) {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed corrupted property assignment: "${propertyNameStr}":${corruptedPartStr}": "${valueStr}" -> "${propertyNameStr}": "${valueStr}"`,
            );
          }
          return `"${propertyNameStr}": "${valueStr}"`;
        }

        return match;
      },
    );

    // ===== Pattern 79: Fix typos in property names =====
    // Pattern: `"type savory":` -> `"type":`
    // Handles cases where extra words are added to property names
    const typoInPropertyNamePattern79 = /"([^"]+)\s+([a-zA-Z]+)"\s*:\s*"/g;
    sanitized = sanitized.replace(
      typoInPropertyNamePattern79,
      (match, propertyPart, extraWord, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        // Property names are not inside string values, so we should NOT be in a string
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if propertyPart looks like a valid property name (basic validation)
        // We'll accept any property name that doesn't contain spaces in the first part

        const propertyPartStr = typeof propertyPart === "string" ? propertyPart : "";
        const extraWordStr = typeof extraWord === "string" ? extraWord : "";

        // Check if propertyPart looks like a valid property name (no spaces, reasonable length)
        if (
          propertyPartStr.length > 0 &&
          propertyPartStr.length <= 50 &&
          !propertyPartStr.includes(" ")
        ) {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed typo in property name: "${propertyPartStr} ${extraWordStr}" -> "${propertyPartStr}"`,
            );
          }
          return `"${propertyPartStr}": "`;
        }

        return match;
      },
    );

    // ===== Pattern 80: Convert underscores to dots in package names =====
    // Pattern: `"io_swagger.v3"` -> `"io.swagger.v3"`
    // Handles cases where underscores are used instead of dots in package names
    // Package names are always in quoted strings, so we can apply this directly
    const underscoreToDotPattern80 = /"([a-zA-Z_$][a-zA-Z0-9_$]*)_([a-zA-Z0-9_$.]+)"/g;
    sanitized = sanitized.replace(underscoreToDotPattern80, (match, prefix, rest) => {
      // Only apply if it looks like a package name (contains dots or common package prefixes)
      const prefixStr = typeof prefix === "string" ? prefix : "";
      const restStr = typeof rest === "string" ? rest : "";
      const fullMatch = `${prefixStr}_${restStr}`;

      // Check if it's likely a package name (contains dots)
      // If rest contains dots, it's likely a package name where underscore should be a dot
      const isPackageName = restStr.includes(".");

      if (isPackageName) {
        hasChanges = true;
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed underscore to dot in package name: "${fullMatch}" -> "${prefixStr}.${restStr}"`,
          );
        }
        return `"${prefixStr}.${restStr}"`;
      }

      return match;
    });

    // ===== Pattern 81: Remove stray text/comments from JSON (enhanced) =====
    // Pattern: `there are more methods, but I will stop here` -> remove
    // Removes stray text that appears between JSON elements
    const strayTextPattern81 =
      /([}\],])\s*\n\s*([a-z][a-z\s,]+(?:but|and|or|the|a|an|is|are|was|were|will|would|should|could|can|may|might|this|that|these|those|here|there)[a-z\s,]*?)\s*\n\s*([{[]|")/gi;
    sanitized = sanitized.replace(
      strayTextPattern81,
      (match, delimiter, strayText, nextChar, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid context (after delimiter)
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isAfterDelimiter = /[}\],]\s*\n\s*$/.test(beforeMatch);

        if (isAfterDelimiter) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const nextCharStr = typeof nextChar === "string" ? nextChar : "";
          const strayTextStr = typeof strayText === "string" ? strayText : "";
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed stray text: "${strayTextStr.trim()}"`);
          }
          return `${delimiterStr}\n${nextCharStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 81.5: Fix missing colon after property name =====
    // Pattern: `"propertyName []"` or `"propertyName {}"` -> `"propertyName": []` or `"propertyName": {}`
    // Also handles with comma: `"propertyName [],"` -> `"propertyName": [],`
    const missingColonAfterPropertyPattern815 = /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s+(\[|\{)/g;
    sanitized = sanitized.replace(
      missingColonAfterPropertyPattern815,
      (match, propertyName, bracket, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const bracketStr = typeof bracket === "string" ? bracket : "";

        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) ||
          /}\s*,\s*\n\s*$/.test(beforeMatch) ||
          /\n\s*$/.test(beforeMatch) ||
          numericOffset < 200;

        if (isPropertyContext) {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing colon after property name: "${propertyNameStr}" ${bracketStr} -> "${propertyNameStr}": ${bracketStr}`,
            );
          }
          return `"${propertyNameStr}": ${bracketStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 82: Remove Java code after JSON closing brace =====
    // Pattern: Remove Java code (package, import, class definitions) that appears after the JSON closing brace
    // This handles cases where LLMs include source code after the JSON response
    const javaCodeAfterJsonPattern =
      /(}\s*)(\n\s*)(package\s+|import\s+|public\s+(class|interface|enum|record|@interface)|private\s+(class|interface|enum|record)|protected\s+(class|interface|enum|record)|@[A-Z][a-zA-Z]*\s*$)/m;
    const javaCodeMatch = javaCodeAfterJsonPattern.exec(sanitized);
    if (javaCodeMatch) {
      const matchIndex = javaCodeMatch.index;
      const closingBraceIndex = matchIndex + javaCodeMatch[1].length - 1;

      // Verify that this is the last closing brace (main JSON object)
      // Count braces to ensure we're at the root level
      let braceDepth = 0;
      let inString = false;
      let escape = false;
      let lastRootClosingBrace = -1;

      for (let i = 0; i < sanitized.length; i++) {
        const char = sanitized[i];
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
          if (char === "{") {
            braceDepth++;
          } else if (char === "}") {
            braceDepth--;
            if (braceDepth === 0) {
              lastRootClosingBrace = i;
            }
          }
        }
      }

      // If the match is after the last root closing brace, remove everything after it
      if (lastRootClosingBrace >= 0 && closingBraceIndex >= lastRootClosingBrace) {
        sanitized = sanitized.substring(0, lastRootClosingBrace + 1);
        hasChanges = true;
        if (diagnostics.length < 10) {
          diagnostics.push("Removed Java code after JSON closing brace");
        }
      }
    }

    // ===== Pattern 83: Remove binary corruption markers =====
    // Pattern: Remove binary corruption markers like <x_bin_151>publicConstants
    // Also handle case where marker is followed by property name without quote
    const binaryCorruptionPattern = /<x_bin_\d+>([a-zA-Z_$][a-zA-Z0-9_$]*"\s*:)/g;
    sanitized = sanitized.replace(
      binaryCorruptionPattern,
      (match, propertyPart, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }
        hasChanges = true;
        const propertyPartStr = typeof propertyPart === "string" ? propertyPart : "";
        if (diagnostics.length < 10) {
          diagnostics.push(`Removed binary corruption marker and fixed property name`);
        }
        // Add missing quote before property name
        return `"${propertyPartStr}`;
      },
    );

    // Also handle standalone markers
    const binaryCorruptionPatternStandalone = /<x_bin_\d+>/g;
    sanitized = sanitized.replace(binaryCorruptionPatternStandalone, (match, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }
      hasChanges = true;
      if (diagnostics.length < 10) {
        diagnostics.push(`Removed binary corruption marker: ${match}`);
      }
      return "";
    });

    // ===== Pattern 86: Fix wrong quote characters (non-ASCII quotes) =====
    // Pattern: Fix non-ASCII quotes like ʻpropertyName" -> "propertyName"
    // Common wrong quotes: ʻ (U+02BB), ' (U+2018), ' (U+2019), " (U+201C), " (U+201D)
    const wrongQuotePattern = /([ʻ''""])([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    sanitized = sanitized.replace(
      wrongQuotePattern,
      (match, wrongQuote, propertyName, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }
        hasChanges = true;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        if (diagnostics.length < 10) {
          diagnostics.push(
            `Fixed wrong quote character in property name: ${wrongQuote}${propertyNameStr}" -> "${propertyNameStr}"`,
          );
        }
        return `"${propertyNameStr}":`;
      },
    );

    // ===== Pattern 87: Fix missing opening quotes in array elements =====
    // Pattern: Fix patterns like ax"stringValue... or prefix.stringValue... in arrays
    // This handles cases where part of the string is missing before the quote
    // Match either: [a-z]+\. (like prefix.) or \. (like .suffix)
    const missingOpeningQuoteInArrayPattern87 =
      /(\[|,\s*|\n\s*)(\s*)([a-z]{1,5})"((?:[a-z]+\.|\.)[a-z]+\.[a-z]+[^"]*)"(\s*,|\s*\])/g;
    sanitized = sanitized.replace(
      missingOpeningQuoteInArrayPattern87,
      (match, prefix, whitespace, prefixText, packageName, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
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

        const prefixStr = typeof prefix === "string" ? prefix : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const prefixTextStr = typeof prefixText === "string" ? prefixText : "";
        const packageNameStr = typeof packageName === "string" ? packageName : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        // Remove the prefix text and use the package name as-is
        // Generic case: if prefix is short and package name contains dots, it's likely a package name
        let fullPackageName = packageNameStr;
        if (prefixTextStr.length <= 5 && packageNameStr.includes(".")) {
          // Generic case: remove the prefix and use the package name
          fullPackageName = packageNameStr;
        } else {
          // Don't modify if we can't determine the pattern
          return match;
        }

        // Check if prefix indicates array context
        const isInArrayContext =
          prefixStr === "[" ||
          prefixStr.startsWith(",") ||
          (foundArray && prefixStr.includes("\n"));

        if (isInArrayContext || foundArray || prefixStr === "[") {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed missing opening quote in array element: ${prefixTextStr}"${packageNameStr}" -> "${fullPackageName}"`,
            );
          }
          return `${prefixStr}${whitespaceStr}"${fullPackageName}"${terminatorStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 88: Remove invalid properties in arrays =====
    // Pattern: Remove invalid properties like _DOC_GEN_NOTE_LIMITED_REF_LIST_ = "..." from arrays
    const invalidPropertyInArrayPattern =
      /(\[|,\s*|\n\s*)(\s*)(_[A-Z_]+)\s*=\s*"([^"]+)"(\s*,|\s*\])/g;
    sanitized = sanitized.replace(
      invalidPropertyInArrayPattern,
      (match, prefix, _whitespace, invalidProp, _value, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
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

        const prefixStr = typeof prefix === "string" ? prefix : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        // Check if prefix indicates array context
        const isInArrayContext =
          prefixStr === "[" ||
          prefixStr.startsWith(",") ||
          (foundArray && prefixStr.includes("\n"));

        if (isInArrayContext || foundArray || prefixStr === "[") {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(`Removed invalid property from array: ${invalidProp}`);
          }
          // Remove the invalid property
          // If terminator is ], preserve it
          if (terminatorStr.trim().startsWith("]")) {
            // Terminator is ] - preserve it, remove comma if present
            const whitespaceMatch = /^(\s*\n\s*|\s*)/.exec(terminatorStr);
            const whitespaceBeforeBracket = whitespaceMatch?.[0] ?? "";
            return `${whitespaceBeforeBracket}]`;
          } else if (prefixStr.trim().startsWith(",") && terminatorStr.trim().startsWith(",")) {
            // Both sides have commas, remove element but keep one comma
            return ",";
          } else if (prefixStr.trim().startsWith(",")) {
            // Only prefix has comma, keep it
            return prefixStr.trim();
          } else {
            // No comma before, just remove
            return "";
          }
        }

        return match;
      },
    );

    // ===== Pattern 89: Fix malformed JSON fragments in string values =====
    // Pattern: Detect and escape unescaped quotes or fix malformed JSON-like content in descriptions
    // This handles cases where descriptions contain JSON-like content that breaks parsing
    // Pattern: Look for unescaped quotes in string values that might break JSON
    // We'll be conservative and only fix obvious issues

    // Fix duplicate property names in descriptions (e.g., `"propertyName": "propertyName": "text"` -> `"propertyName": "text"`)
    // Also handles cases where the property name is duplicated in the value
    const duplicatePropertyInDescriptionPattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"\1"\s*:\s*"([^"]*)"(\s*[,}])/g;
    sanitized = sanitized.replace(
      duplicatePropertyInDescriptionPattern,
      (match, propertyName, value, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext = /[{,]\s*$/.test(beforeMatch) || /\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const valueStr = typeof value === "string" ? value : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";

          // Remove the duplicate property name and keep the value
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed duplicate property name "${propertyNameStr}" in ${propertyNameStr} field`,
            );
          }
          return `"${propertyNameStr}": "${valueStr}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Fix malformed JSON in descriptions where multiple properties are concatenated
    // Pattern: `"propertyName": "propertyName": "text", "anotherProperty": [], ...`
    // This handles cases where JSON structure is concatenated into a single string value
    // We need to escape the inner quotes and structure to make it a valid JSON string
    const concatenatedPropertiesInStringPattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"([^"]*)"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:\s*"([^"]*)"(\s*,\s*"[^"]*"\s*:\s*[^,}]+)*(\s*[,}])/g;
    sanitized = sanitized.replace(
      concatenatedPropertiesInStringPattern,
      (
        match,
        propertyName,
        firstValue,
        _secondProperty,
        _secondValue,
        _additionalProps,
        terminator,
        offset: unknown,
      ) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a valid property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext = /[{,]\s*$/.test(beforeMatch) || /\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
          const firstValueStr = typeof firstValue === "string" ? firstValue : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";

          // If the first value contains the duplicate property name, remove it
          if (firstValueStr === propertyNameStr) {
            // This is a duplicate property name case - we already handle this above
            return match;
          }

          // Otherwise, escape the quotes in the concatenated content to make it a valid string
          const escapedValue = firstValueStr.replace(/"/g, '\\"');
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Fixed malformed JSON in ${propertyNameStr} field - escaped concatenated properties`,
            );
          }
          return `"${propertyNameStr}": "${escapedValue}"${terminatorStr}`;
        }

        return match;
      },
    );

    // Pattern 89: Fix unescaped quotes in description strings
    // Match "description": "..." and manually parse to find unescaped quotes
    // This handles malformed JSON where quotes inside strings aren't escaped
    const descriptionPropertyPattern = /"description"\s*:\s*"/g;
    const replacements: { start: number; end: number; replacement: string }[] = [];

    let match;
    while ((match = descriptionPropertyPattern.exec(sanitized)) !== null) {
      const startOffset = match.index + match[0].length;
      if (isInStringAt(match.index, sanitized)) {
        continue;
      }

      // Check if we're in a valid property context
      if (match.index > 0) {
        const beforeMatch = sanitized.substring(Math.max(0, match.index - 100), match.index);
        const isPropertyContext = /[{,]\s*$/.test(beforeMatch) || /\n\s*$/.test(beforeMatch);
        if (!isPropertyContext) {
          continue;
        }
      }

      // Manually parse the string content to find unescaped quotes
      let content = "";
      let i = startOffset;
      let inEscape = false;
      let foundClosing = false;
      let fixed = false;

      while (i < sanitized.length) {
        const char = sanitized[i];
        if (inEscape) {
          content += char;
          inEscape = false;
          i++;
          continue;
        }
        if (char === "\\") {
          content += char;
          inEscape = true;
          i++;
          continue;
        }
        if (char === '"') {
          // Check if this is the closing quote (followed by , or })
          const nextChars = sanitized.substring(i + 1).trim();
          if (nextChars.startsWith(",") || nextChars.startsWith("}")) {
            // This is the closing quote
            foundClosing = true;
            break;
          }
          // This is an unescaped quote inside the string - escape it
          content += '\\"';
          fixed = true;
          i++; // Move past the quote
        } else {
          content += char;
          i++;
        }
      }

      if (foundClosing && fixed) {
        const endOffset = i;
        const afterContent = sanitized.substring(i + 1);
        const terminatorRegex = /^(\s*[,}])/;
        const terminatorMatch = terminatorRegex.exec(afterContent);
        const terminator = terminatorMatch ? terminatorMatch[1] : "";
        replacements.push({
          start: match.index,
          end: endOffset + 1 + (terminatorMatch ? terminatorMatch[0].length : 0),
          replacement: `"description": "${content}"${terminator}`,
        });
        hasChanges = true;
        if (diagnostics.length < 10) {
          diagnostics.push("Fixed unescaped quotes in description string value");
        }
      } else if (fixed && !foundClosing) {
        // If we fixed quotes but didn't find a closing quote, continue parsing to find it
        // This handles cases where unescaped quotes are in the middle of the string
        while (i < sanitized.length) {
          const char = sanitized[i];
          if (char === '"') {
            const nextChars = sanitized.substring(i + 1).trim();
            if (nextChars.startsWith(",") || nextChars.startsWith("}")) {
              // Found the closing quote
              const afterContent = sanitized.substring(i + 1);
              const terminatorRegex = /^(\s*[,}])/;
              const terminatorMatch = terminatorRegex.exec(afterContent);
              const terminator = terminatorMatch ? terminatorMatch[1] : "";
              replacements.push({
                start: match.index,
                end: i + 1 + (terminatorMatch ? terminatorMatch[0].length : 0),
                replacement: `"description": "${content}"${terminator}`,
              });
              hasChanges = true;
              if (diagnostics.length < 10) {
                diagnostics.push("Fixed unescaped quotes in description string value");
              }
              break;
            } else {
              // Another unescaped quote - escape it
              content += '\\"';
              i++;
            }
          } else {
            content += char;
            i++;
          }
        }
      }
    }

    // Apply replacements in reverse order to maintain indices
    for (let j = replacements.length - 1; j >= 0; j--) {
      const repl = replacements[j];
      sanitized =
        sanitized.substring(0, repl.start) + repl.replacement + sanitized.substring(repl.end);
    }

    // ===== Pattern 90: Fix extra characters before array elements =====
    // Pattern: `e    "stringValue",` `g    "stringValue",` `ax      "value",`
    // Handles cases where single or multiple characters (1-4) appear before quoted strings in arrays
    // Match ,\n or just \n as delimiter to handle both cases
    const extraCharsBeforeArrayElementPattern =
      /((?:,\s*)?\n|^)(\s*)([a-z]{1,4})\s+("([^"]+)"\s*(,|\]))/g;
    sanitized = sanitized.replace(
      extraCharsBeforeArrayElementPattern,
      (
        match,
        delimiter,
        whitespace,
        extraChars,
        quotedString,
        _stringValue,
        terminator,
        offset: unknown,
      ) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context - look for array patterns
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        // Simple check: if we see a comma+newline or quoted string+comma+newline before us,
        // we're likely in an array (this pattern is very specific to arrays anyway)
        const hasArrayPattern =
          /,\s*\n\s*$/.test(beforeMatch) || /"\s*,\s*\n\s*$/.test(beforeMatch);
        const hasArrayBracket = beforeMatch.includes("[");
        // Also check if delimiter is newline and we have array-like context
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const isLikelyArray =
          hasArrayPattern ||
          (delimiterStr.includes("\n") && hasArrayBracket) ||
          /\[\s*$/.test(beforeMatch);

        if (isLikelyArray) {
          hasChanges = true;
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const quotedStringStr = typeof quotedString === "string" ? quotedString : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          const extraCharsStr = typeof extraChars === "string" ? extraChars : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed extra characters '${extraCharsStr}' before array element: "${quotedStringStr.substring(0, 30)}..."`,
            );
          }
          return `${delimiterStr}${whitespaceStr}${quotedStringStr}${terminatorStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 92: Fix corrupted property values with extra text after commas =====
    // Pattern: `"propertyName": value, a` -> `"propertyName": value,`
    // Handles cases where extra text appears after a property value and comma
    const corruptedPropertyValuePattern = /"([^"]+)"\s*:\s*([^,}]+)\s*,\s*([a-z])\s*([,}\]]|\n)/g;
    sanitized = sanitized.replace(
      corruptedPropertyValuePattern,
      (match, propertyName, value, extraText, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if the extra text looks like stray text (single letter, not a valid JSON value)
        const extraTextStr = typeof extraText === "string" ? extraText : "";
        const valueStr = typeof value === "string" ? value : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const terminatorStr = typeof terminator === "string" ? terminator : "";

        // Check if it's a single letter that's not part of a valid JSON value
        if (/^[a-z]$/i.test(extraTextStr) && !/^(true|false|null)$/i.test(extraTextStr)) {
          hasChanges = true;
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed extra text '${extraTextStr}' after property value: "${propertyNameStr}": ${valueStr}, ${extraTextStr}`,
            );
          }
          return `"${propertyNameStr}": ${valueStr},${terminatorStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 47: Remove markdown list markers in arrays =====
    // Pattern: `*   "lombok.NoArgsConstructor",` -> `"lombok.NoArgsConstructor",`
    // This handles markdown list items that appear in JSON arrays
    const markdownListInArrayPattern = /([}\],]|\n|^)(\s*)\*\s+("([^"]+)"\s*,)/g;
    sanitized = sanitized.replace(
      markdownListInArrayPattern,
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
            diagnostics.push("Removed markdown list marker (*) in array");
          }
          return `${delimiterStr}${whitespaceStr}${quotedElementStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 48: Remove stray text after string values =====
    // Pattern: `"lombok.RequiredArgsConstructor",JACKSON-CORE-2.12.0.JAR"` -> `"lombok.RequiredArgsConstructor",`
    // Also handles: `"com.google.common.truth.Truth8"` after string
    // This handles cases where library names, JAR names, or other text appears after a string value
    const strayTextAfterStringPattern =
      /"([^"]+)"\s*,?\s*([A-Z][A-Z0-9_.-]{5,50})"\s*([,}\]]|\n|$)/g;
    sanitized = sanitized.replace(
      strayTextAfterStringPattern,
      (match, stringValue, strayText, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if it looks like a library/JAR name (all caps, contains dots/dashes, ends with quote)
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const looksLikeLibraryName =
          /^[A-Z][A-Z0-9_.-]+$/.test(strayTextStr) &&
          (strayTextStr.includes(".") || strayTextStr.includes("-") || strayTextStr.length > 10);

        if (looksLikeLibraryName) {
          hasChanges = true;
          const stringValueStr = typeof stringValue === "string" ? stringValue : "";
          const terminatorStr = typeof terminator === "string" ? terminator : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray library/JAR name '${strayTextStr}' after string: "${stringValueStr.substring(0, 30)}..."`,
            );
          }
          // Ensure there's a comma if we're in an array context
          const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 200), numericOffset);
          const isInArray =
            /\[\s*$/.test(beforeMatch) ||
            /,\s*\n\s*$/.test(beforeMatch) ||
            /"\s*,\s*\n\s*$/.test(beforeMatch);
          const comma = isInArray && !match.includes(",") ? "," : "";
          return `"${stringValueStr}"${comma}${terminatorStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 49: Remove config-like text before properties =====
    // Pattern: `post_max_size = 20M    "propertyName":` -> `"propertyName":`
    // This handles configuration text, environment variable assignments, etc. that appear before properties
    const configTextBeforePropertyPattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z_][a-zA-Z0-9_]*\s*=\s*[^\s"]{1,20})\s+("([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:)/g;
    sanitized = sanitized.replace(
      configTextBeforePropertyPattern,
      (
        match,
        delimiter,
        whitespace,
        configText,
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
          const configTextStr = typeof configText === "string" ? configText : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed config text '${configTextStr}' before property: ${propertyWithQuoteStr}`,
            );
          }
          return `${delimiterStr}${whitespaceStr}${propertyWithQuoteStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 51: Fix truncated property names with stray text fragments =====
    // Pattern: `aus": "dateFormat"` -> `"dateFormat": "dateFormat"` (or infer correct property name)
    // This handles cases where a short fragment appears before what looks like a property value
    // The fragment might be a truncated property name or stray text
    const truncatedPropertyWithFragmentPattern =
      /([}\],]|\n|^)(\s*)([a-z]{2,4})"\s*:\s*"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;
    sanitized = sanitized.replace(
      truncatedPropertyWithFragmentPattern,
      (match, delimiter, whitespace, fragment, propertyValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in a property context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 100), numericOffset);
        const isPropertyContext =
          /[{,]\s*$/.test(beforeMatch) || /}\s*,\s*\n\s*$/.test(beforeMatch);

        if (isPropertyContext) {
          // The propertyValue looks like it might be the actual property name
          // Check if it's a known property name pattern
          const propertyValueStr = typeof propertyValue === "string" ? propertyValue : "";
          const fragmentStr = typeof fragment === "string" ? fragment : "";
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";

          // If the propertyValue looks like a property name (camelCase, PascalCase, or common property names)
          const looksLikePropertyName =
            /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(propertyValueStr) &&
            (propertyValueStr.length > 3 ||
              /^(name|type|value|path|method)$/i.test(propertyValueStr));

          if (looksLikePropertyName) {
            hasChanges = true;
            if (diagnostics.length < 10) {
              diagnostics.push(
                `Fixed truncated property name: ${fragmentStr}": "${propertyValueStr}" -> "${propertyValueStr}": "${propertyValueStr}"`,
              );
            }
            // Use the propertyValue as the property name (it might be the actual property name)
            return `${delimiterStr}${whitespaceStr}"${propertyValueStr}": "${propertyValueStr}"`;
          }
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
    logOneLineWarning(`fixMalformedJsonPatterns sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
