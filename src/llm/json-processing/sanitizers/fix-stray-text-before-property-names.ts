import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes stray text directly concatenated before property names.
 *
 * This sanitizer addresses cases where LLM responses contain stray words or text
 * directly concatenated to the opening quote of a property name, which breaks JSON parsing.
 *
 * Examples of issues this sanitizer handles:
 * - `tribal"integrationPoints":` -> `"integrationPoints":`
 * - `word"propertyName":` -> `"propertyName":`
 * - `fragment"name":` -> `"name":`
 * - `e"publicMethods":` -> `"publicMethods":` (single character stray text)
 * - `extraText: "externalReferences":` -> `"externalReferences":` (stray text with colon)
 * - `করার"org.apache...":` -> `"org.apache..."` (non-ASCII/Bengali stray text before array element)
 * - `word"arrayValue",` -> `"arrayValue",` (stray text before array string values)
 *
 * This is different from `removeStrayLinePrefixChars` which handles stray text
 * with whitespace between the text and the JSON token. This sanitizer handles
 * cases where the stray text is directly concatenated (no whitespace) or followed
 * by a colon before the property name.
 *
 * Strategy:
 * Uses regex to identify patterns where a word (not valid JSON) appears directly
 * before a quoted property name, or where stray text with a colon appears before
 * a quoted property name, and removes the stray text while preserving
 * the proper property name format.
 */
export const fixStrayTextBeforePropertyNames: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: word characters directly before a quoted property name
    // Matches: word"propertyName": where word is stray text and propertyName is valid
    // This pattern appears after object/array delimiters or newlines (property boundaries)
    // The stray text can be 1 or more characters (single chars like "e" or multi-char like "tribal")
    // and should not be a valid JSON keyword
    // Note: Match delimiters (}, ], ,, or \n) or start of string, followed by optional whitespace
    // then stray text directly concatenated to the quote
    // This catches patterns like: }word"property":, \nword"property":, e"property":, or \n    word"property":
    // Updated to also match non-ASCII characters (Unicode word characters) like Bengali text
    // \p{L} matches any Unicode letter, \p{M} matches marks, \p{N} matches numbers
    // We use [\w\u0080-\uFFFF$] as a fallback for environments that don't support \p{} patterns
    // Note: $ is explicitly included since \w doesn't include it
    // Pattern also handles cases like: ],e"property": or },e"property": (no whitespace after comma)
    const strayTextPattern =
      /([}\],]|\n|^)(\s*)([\w\u0080-\uFFFF$]{1,})"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;

    sanitized = sanitized.replace(
      strayTextPattern,
      (match, delimiter, whitespace, strayText, propertyName, offset, string) => {
        // Type assertions for regex match groups
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Verify we're in a valid property context
        // The delimiter should be }, ], ,, \n, or start of string
        const isValidDelimiter =
          delimiterStr === "" || delimiterStr === "\n" || /[}\],]/.test(delimiterStr);

        // Additional check: ensure the stray text doesn't look like valid JSON
        // (not a JSON keyword or structure)
        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

        // Verify we're not inside a string value by checking context before the match
        // Look backwards to see if we're inside a string (odd number of quotes before us)
        // However, if we have a clear delimiter (}, ], or ,) followed by newline, we can be
        // more confident this is a property boundary and not inside a string
        let isInsideString = false;
        if (offsetNum !== undefined && stringStr) {
          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 200), offsetNum);
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
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
          // If we're inside a string (odd quote count), mark as inside string
          isInsideString = quoteCount % 2 === 1;
        }

        // If we have a clear property delimiter (}, ], ,) followed by newline and stray text,
        // this is almost certainly a property boundary, not inside a string value
        // We can safely fix it even if quote-counting suggests we're inside a string
        const hasClearDelimiterAndNewline =
          /[}\],]/.test(delimiterStr) && whitespaceStr.includes("\n");

        // Additional check: if we're right after a closing brace/bracket+comma pattern,
        // we're definitely at a property boundary, regardless of quote counting
        // This handles cases like: },\ne"publicMethods": or ],e"publicMethods": where the delimiter matched is ","
        // but we're actually after a "}," or "]," sequence (with or without whitespace/newline)
        let isAfterClosingDelimiter = false;
        if (offsetNum !== undefined && offsetNum > 0) {
          // Look back further to catch ],e or },e patterns where there's no whitespace between comma and stray text
          const beforeDelimiter = stringStr.substring(Math.max(0, offsetNum - 10), offsetNum);
          // Check if we're after }, ], or }, patterns (with or without whitespace/newline)
          // This includes cases like: ],e or },e (no whitespace between comma and stray text)
          if (
            /[}\]]\s*,\s*[\w\u0080-\uFFFF$]*$/.test(beforeDelimiter) ||
            /[}\]]\s*,\s*$/.test(beforeDelimiter)
          ) {
            isAfterClosingDelimiter = true;
          }
        }

        // Don't fix if we're inside a string AND we don't have a clear delimiter context
        // However, if we're clearly after a closing delimiter, we can safely fix it
        if (isInsideString && !hasClearDelimiterAndNewline && !isAfterClosingDelimiter) {
          return match;
        }

        if (isValidDelimiter && !isStrayTextValid) {
          hasChanges = true;
          diagnostics.push(
            `Removed stray text "${strayTextStr}" before property "${propertyNameStr}"`,
          );
          // Preserve delimiter and whitespace
          const finalDelimiter = delimiterStr === "" ? "" : delimiterStr;
          return `${finalDelimiter}${whitespaceStr}"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // Second pass: Fix stray text with colon before quoted property names
    // Pattern: word: "propertyName": where word is stray text
    // Example: extraText: "externalReferences": -> "externalReferences":
    // Updated to also match non-ASCII characters
    const strayTextWithColonPattern =
      /([}\],]|\n|^)(\s*)([\w\u0080-\uFFFF][\w\u0080-\uFFFF]*)\s*:\s*"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;

    sanitized = sanitized.replace(
      strayTextWithColonPattern,
      (match, delimiter, whitespace, strayText, propertyName, offset, string) => {
        // Type assertions for regex match groups
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Verify we're in a valid property context
        const isValidDelimiter =
          delimiterStr === "" || delimiterStr === "\n" || /[}\],]/.test(delimiterStr);

        // Check if stray text is a valid JSON keyword
        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

        // Check if we're inside a string value
        let isInsideString = false;
        if (offsetNum !== undefined && stringStr) {
          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 200), offsetNum);
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
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
          isInsideString = quoteCount % 2 === 1;
        }

        // Check for clear delimiter context
        const hasClearDelimiterAndNewline =
          /[}\],]/.test(delimiterStr) && whitespaceStr.includes("\n");

        let isAfterClosingDelimiter = false;
        if (offsetNum !== undefined && offsetNum > 0) {
          const beforeDelimiter = stringStr.substring(Math.max(0, offsetNum - 5), offsetNum);
          if (/[}\]]\s*,\s*$/.test(beforeDelimiter)) {
            isAfterClosingDelimiter = true;
          }
        }

        // Don't fix if we're inside a string AND we don't have a clear delimiter context
        if (isInsideString && !hasClearDelimiterAndNewline && !isAfterClosingDelimiter) {
          return match;
        }

        if (isValidDelimiter && !isStrayTextValid) {
          hasChanges = true;
          diagnostics.push(
            `Removed stray text with colon "${strayTextStr}:" before property "${propertyNameStr}"`,
          );
          const finalDelimiter = delimiterStr === "" ? "" : delimiterStr;
          return `${finalDelimiter}${whitespaceStr}"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // Third pass: Fix stray text (including non-ASCII) before array string values
    // Pattern: word"stringValue", where word is stray text and stringValue is an array element
    // Example: করার"org.apache...", -> "org.apache...",
    // Example: e"org.junit.jupiter.api.extension.ExtendWith", -> "org.junit.jupiter.api.extension.ExtendWith",
    // This handles cases where non-ASCII or ASCII stray text appears before array string elements
    // Note: The delimiter can be }, ], ,, \n, or start of line, followed by whitespace
    // Updated to handle comma-newline sequences: match either (delimiter+newline) or (delimiter without newline)
    // Updated to use a broader character class that includes all Unicode letters and symbols
    const strayTextBeforeArrayValuePattern =
      /(?:([}\],])\s*\n|([}\],])|(\n)|(^))(\s*)([^\s"{}[\],]{1,})"([^"]+)"\s*,/g;

    sanitized = sanitized.replace(
      strayTextBeforeArrayValuePattern,
      (
        match,
        delimiterWithNewline,
        delimiter,
        newlineOnly,
        startOnly,
        whitespace,
        strayText,
        stringValue,
        offset,
        string,
      ) => {
        // Extract and type-check all parameters
        const delimiterWithNewlineStr =
          typeof delimiterWithNewline === "string" ? delimiterWithNewline : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const newlineOnlyStr = typeof newlineOnly === "string" ? newlineOnly : "";
        const startOnlyStr = typeof startOnly === "string" ? startOnly : "";
        // Combine delimiter groups - one of them will be non-empty
        const combinedDelimiter =
          delimiterWithNewlineStr || delimiterStr || newlineOnlyStr || startOnlyStr || "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const stringValueStr = typeof stringValue === "string" ? stringValue : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        // Check if we're in an array context
        // Look backwards to see if we're inside an array
        let isInArray = false;
        if (offsetNum !== undefined && stringStr) {
          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 500), offsetNum);
          let openBrackets = 0;
          let openBraces = 0;
          let inString = false;
          let escapeNext = false;
          let lastBracketIndex = -1;

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
              if (char === "]") {
                openBrackets++;
                if (lastBracketIndex === -1) lastBracketIndex = i;
              } else if (char === "[") {
                openBrackets--;
                // If we've seen a closing bracket and braces are balanced, we're in an array
                if (openBrackets === 0 && openBraces === 0 && lastBracketIndex > i) {
                  isInArray = true;
                  break;
                }
              } else if (char === "}") openBraces++;
              else if (char === "{") openBraces--;
            }
          }
          // Also check: if we're after a comma-newline or comma within what looks like an array structure
          // This handles cases where the pattern matches but bracket counting missed it
          // delimiterWithNewlineStr will contain the comma if it matched with newline
          const isAfterComma = delimiterWithNewlineStr === "," || delimiterStr === ",";
          if (!isInArray && isAfterComma) {
            // Look for an opening bracket before us
            const hasOpeningBracket = beforeMatch.includes("[");
            if (hasOpeningBracket && openBraces === 0) {
              isInArray = true;
            }
          }
        }

        // Verify the delimiter context
        // Accept empty, newline, or delimiter characters (delimiterWithNewlineStr handles comma-newline)
        const isValidDelimiter =
          combinedDelimiter === "" ||
          combinedDelimiter === "\n" ||
          /[}\],]/.test(combinedDelimiter);

        // Check if we're inside a string value (shouldn't be for array elements)
        let isInsideString = false;
        if (offsetNum !== undefined && stringStr) {
          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 200), offsetNum);
          let quoteCount = 0;
          let escape = false;
          for (const char of beforeMatch) {
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
          isInsideString = quoteCount % 2 === 1;
        }

        // Only fix if we're in an array context and not inside a string
        if (isInArray && !isInsideString && isValidDelimiter) {
          hasChanges = true;
          // Check if stray text is non-ASCII (likely foreign language text)
          const isNonASCII = /[\u0080-\uFFFF]/.test(strayTextStr);
          const textType = isNonASCII ? "non-ASCII" : "ASCII";
          diagnostics.push(
            `Removed ${textType} stray text "${strayTextStr}" before array element "${stringValueStr.substring(0, 50)}${stringValueStr.length > 50 ? "..." : ""}"`,
          );
          // Preserve the delimiter format - if it was delimiter+newline, keep it
          let finalDelimiter = "";
          if (delimiterWithNewlineStr) {
            finalDelimiter = `${delimiterWithNewlineStr}\n`;
          } else if (delimiterStr) {
            finalDelimiter = delimiterStr;
          } else if (newlineOnlyStr) {
            finalDelimiter = "\n";
          } else if (startOnlyStr) {
            finalDelimiter = "";
          }
          return `${finalDelimiter}${whitespaceStr}"${stringValueStr}",`;
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? SANITIZATION_STEP.FIXED_STRAY_TEXT_BEFORE_PROPERTY_NAMES
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixStrayTextBeforePropertyNames sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
