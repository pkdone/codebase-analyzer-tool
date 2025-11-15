import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../constants/sanitization-steps.config";
import { DELIMITERS, JSON_KEYWORDS } from "../constants/json-processing.config";

/**
 * Consolidated sanitizer that removes invalid prefixes and stray text from JSON.
 *
 * This sanitizer combines functionality from multiple sanitizers to handle:
 * 1. Thought markers and text before JSON (from remove-thought-markers)
 * 2. Stray characters at line starts (from remove-stray-line-prefix-chars)
 * 3. Stray text concatenated before property names (from fix-stray-text-before-property-names)
 * 4. Complete stray lines between structures (from remove-stray-lines-between-structures)
 * 5. Stray text before opening braces in arrays (from fix-binary-corruption-patterns Pattern 2)
 *
 * Examples of issues this sanitizer handles:
 * - `<ctrl94>thought\n` -> removed
 * - `Thought:\n` -> removed
 * - `command{` -> `{` (removes word before opening brace)
 * - `e            "customerId"` -> `            "customerId"` (removes stray prefix)
 * - `tribal"integrationPoints":` -> `"integrationPoints":` (removes stray text before property)
 * - `],\nprocrastinate\n  "property"` -> `],\n  "property"` (removes stray line)
 * - `},\nso{` -> `},\n    {` (removes stray text before brace in array)
 */
export const removeInvalidPrefixes: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

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

    // Helper to check if we're in an array context
    function isInArrayContext(beforeMatch: string): boolean {
      let bracketDepth = 0;
      let braceDepth = 0;
      let inString = false;
      let escapeNext = false;
      let foundOpeningBracket = false;

      // Scan backwards to find if we're in an array
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
            bracketDepth++;
          } else if (char === "[") {
            bracketDepth--;
            foundOpeningBracket = true;
            if (bracketDepth >= 0 && braceDepth <= 0) {
              return true;
            }
          } else if (char === "}") {
            braceDepth++;
          } else if (char === "{") {
            braceDepth--;
          }
        }
      }

      if (foundOpeningBracket && braceDepth <= 0) {
        return true;
      }

      return false;
    }

    // ===== Pattern 1: Remove thought markers =====
    // Pattern 1a: Remove <ctrl94>thought or similar control-style thought markers
    const ctrlThoughtPattern = /<ctrl\d+>\s*thought\s*\n/i;
    sanitized = sanitized.replace(ctrlThoughtPattern, () => {
      hasChanges = true;
      return "";
    });

    // Pattern 1b: Remove literal "thought" markers at start of string
    const thoughtMarkerPattern = /^thought\s*:?\s*\n/i;
    sanitized = sanitized.replace(thoughtMarkerPattern, () => {
      hasChanges = true;
      return "";
    });

    // Pattern 1c: Remove text immediately before opening braces (like "command{" or "Here is the JSON: {")
    // Generic pattern that matches common introductory text patterns before opening braces
    // Matches: word (2-20 chars) optionally followed by colon, then whitespace, then opening brace
    // This is more robust than a hardcoded word list and catches variations like "Here is the JSON: {"
    const genericPrefixPattern = /(^|\n|\r)\s*([a-zA-Z_]{2,20})\s*[:]?\s*\{/g;

    sanitized = sanitized.replace(genericPrefixPattern, (match, prefix, word, offset: unknown) => {
      const numericOffset = typeof offset === "number" ? offset : 0;
      const wordStr = typeof word === "string" ? word : "";

      // Skip if we're inside a string
      if (isInStringAt(numericOffset, sanitized)) {
        return match;
      }

      // Skip if this looks like a valid JSON property name context
      // (e.g., after a comma, closing brace, or at the start of an object)
      const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 50), numericOffset);
      const isAfterValidDelimiter = /[}\],]\s*$/.test(beforeMatch) || numericOffset < 100;

      // If it's after a valid delimiter, it might be a property name - be more conservative
      if (isAfterValidDelimiter && wordStr.length > 3) {
        // Only remove if it's clearly an introductory word (short, common words)
        const lowerWord = wordStr.toLowerCase();
        const commonIntroWords = new Set([
          "here",
          "this",
          "that",
          "the",
          "a",
          "an",
          "command",
          "data",
          "result",
          "output",
          "json",
          "response",
          "object",
          "content",
          "payload",
          "body",
          "answer",
          "response",
        ]);
        if (!commonIntroWords.has(lowerWord)) {
          return match;
        }
      }

      hasChanges = true;
      diagnostics.push(`Removed introductory text "${wordStr}" before opening brace`);
      return `${prefix}{`;
    });

    // Also handle cases with whitespace before the word (not at line start)
    sanitized = sanitized.replace(
      /\s+([a-zA-Z_]{2,20})\s*[:]?\s*\{/g,
      (match, word, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const wordStr = typeof word === "string" ? word : "";

        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const matchIndex = sanitized.indexOf(match);
        const beforeMatch = sanitized.substring(Math.max(0, matchIndex - 50), matchIndex);
        // Only remove if it's at the start or after a newline
        if (matchIndex < 500 || /\n\s*$/.test(beforeMatch)) {
          const lowerWord = wordStr.toLowerCase();
          const commonIntroWords = new Set([
            "here",
            "this",
            "that",
            "the",
            "command",
            "data",
            "result",
            "output",
            "json",
            "response",
            "object",
            "content",
            "payload",
            "body",
            "answer",
          ]);
          if (commonIntroWords.has(lowerWord)) {
            hasChanges = true;
            return " {";
          }
        }
        return match;
      },
    );

    // ===== Pattern 2: Remove stray line prefixes =====
    // Lines starting with word characters followed by whitespace and valid JSON tokens
    const lines = sanitized.split(DELIMITERS.NEWLINE);
    const outputLines: string[] = [];
    let inString = false;
    let escape = false;
    let fixedCount = 0;

    const { OPEN_BRACKET, CLOSE_BRACKET, OPEN_BRACE, CLOSE_BRACE, DOUBLE_QUOTE, COMMA } =
      DELIMITERS;
    const keywords = JSON_KEYWORDS.join("|");
    const escapedDelimiters = [
      OPEN_BRACKET,
      CLOSE_BRACKET,
      OPEN_BRACE,
      CLOSE_BRACE,
      DOUBLE_QUOTE,
      COMMA,
    ]
      .map((d) => d.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("");
    const pattern = `^(\\w+)([ \\t]{2,})([${escapedDelimiters}]|\\d|${keywords})`;
    const strayPrefixPattern = new RegExp(pattern);

    for (const [lineIndex, line] of lines.entries()) {
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!inString) {
        const match = strayPrefixPattern.exec(line);
        if (match) {
          const [, prefix, whitespace, token] = match;
          const newLine = whitespace + token + line.slice(match[0].length);
          outputLines.push(newLine);
          fixedCount++;
          if (diagnostics.length < 3) {
            const base = `Line ${lineIndex + 1}: removed prefix '${prefix}' before '${token}'`;
            const abbreviated = line.length > 60 ? `${base} ...` : base;
            diagnostics.push(abbreviated);
          }
          scanStringState(newLine);
          continue;
        }
      }
      outputLines.push(line);
      scanStringState(line);
    }

    if (fixedCount > 0) {
      sanitized = outputLines.join(DELIMITERS.NEWLINE);
      hasChanges = true;
    }

    function scanStringState(text: string): void {
      for (const ch of text) {
        if (inString) {
          if (escape) {
            escape = false;
          } else if (ch === DELIMITERS.BACKSLASH) {
            escape = true;
          } else if (ch === DELIMITERS.DOUBLE_QUOTE) {
            inString = false;
          }
        } else if (ch === DELIMITERS.DOUBLE_QUOTE) {
          inString = true;
        }
      }
      escape = false;
    }

    // ===== Pattern 3: Remove stray text before property names =====
    // Pattern 3a: Stray text directly concatenated before quoted property names
    const strayTextPattern =
      /([}\],]|\n|^)(\s*)([\w\u0080-\uFFFF$]{1,})"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;

    sanitized = sanitized.replace(
      strayTextPattern,
      (match, delimiter, whitespace, strayText, propertyName, offset, string) => {
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        const isValidDelimiter =
          delimiterStr === "" || delimiterStr === "\n" || /[}\],]/.test(delimiterStr);

        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

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

        const hasClearDelimiterAndNewline =
          /[}\],]/.test(delimiterStr) && whitespaceStr.includes("\n");

        let isAfterClosingDelimiter = false;
        if (offsetNum !== undefined && offsetNum > 0) {
          const beforeDelimiter = stringStr.substring(Math.max(0, offsetNum - 10), offsetNum);
          if (
            /[}\]]\s*,\s*[\w\u0080-\uFFFF$]*$/.test(beforeDelimiter) ||
            /[}\]]\s*,\s*$/.test(beforeDelimiter)
          ) {
            isAfterClosingDelimiter = true;
          }
        }

        if (isInsideString && !hasClearDelimiterAndNewline && !isAfterClosingDelimiter) {
          return match;
        }

        if (isValidDelimiter && !isStrayTextValid) {
          hasChanges = true;
          diagnostics.push(
            `Removed stray text "${strayTextStr}" before property "${propertyNameStr}"`,
          );
          const finalDelimiter = delimiterStr === "" ? "" : delimiterStr;
          return `${finalDelimiter}${whitespaceStr}"${propertyNameStr}":`;
        }

        return match;
      },
    );

    // Pattern 3b: Stray text with colon before quoted property names
    const strayTextWithColonPattern =
      /([}\],]|\n|^)(\s*)([\w\u0080-\uFFFF][\w\u0080-\uFFFF]*)\s*:\s*"([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/g;

    sanitized = sanitized.replace(
      strayTextWithColonPattern,
      (match, delimiter, whitespace, strayText, propertyName, offset, string) => {
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        const isValidDelimiter =
          delimiterStr === "" || delimiterStr === "\n" || /[}\],]/.test(delimiterStr);

        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

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

        const hasClearDelimiterAndNewline =
          /[}\],]/.test(delimiterStr) && whitespaceStr.includes("\n");

        let isAfterClosingDelimiter = false;
        if (offsetNum !== undefined && offsetNum > 0) {
          const beforeDelimiter = stringStr.substring(Math.max(0, offsetNum - 5), offsetNum);
          if (/[}\]]\s*,\s*$/.test(beforeDelimiter)) {
            isAfterClosingDelimiter = true;
          }
        }

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

    // Pattern 3c: Stray text before unquoted property names (missing opening quote)
    const strayTextBeforeUnquotedPattern = /([}\],]|\n|^)(\s*)([a-zA-Z_$]{2,})"\s*:/g;

    const propertyNameCorrections: Record<string, string> = {
      tribulations: "tablesAccessed",
    };

    sanitized = sanitized.replace(
      strayTextBeforeUnquotedPattern,
      (match, delimiter, whitespace, strayText, offset, string) => {
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        const isValidDelimiter =
          delimiterStr === "" || delimiterStr === "\n" || /[}\],]/.test(delimiterStr);

        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

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
          if (quoteCount % 2 === 1) {
            return match;
          }
        }

        if (isValidDelimiter && !isStrayTextValid) {
          const lowerStrayText = strayTextStr.toLowerCase();
          const correctedName = propertyNameCorrections[lowerStrayText];

          if (correctedName) {
            hasChanges = true;
            diagnostics.push(
              `Fixed stray text "${strayTextStr}" before unquoted property, corrected to "${correctedName}"`,
            );
            const finalDelimiter = delimiterStr === "" ? "" : delimiterStr;
            return `${finalDelimiter}${whitespaceStr}"${correctedName}":`;
          }

          if (strayTextStr.length >= 2 && /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(strayTextStr)) {
            hasChanges = true;
            diagnostics.push(`Fixed missing opening quote before property name "${strayTextStr}"`);
            const finalDelimiter = delimiterStr === "" ? "" : delimiterStr;
            return `${finalDelimiter}${whitespaceStr}"${strayTextStr}":`;
          }
        }

        return match;
      },
    );

    // Pattern 3d: Stray text before array string values
    // Also handles image/file references like `images/validation/OIG4.9HS_X.8.jpeg`
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
        const delimiterWithNewlineStr =
          typeof delimiterWithNewline === "string" ? delimiterWithNewline : "";
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const newlineOnlyStr = typeof newlineOnly === "string" ? newlineOnly : "";
        const startOnlyStr = typeof startOnly === "string" ? startOnly : "";
        const combinedDelimiter =
          delimiterWithNewlineStr || delimiterStr || newlineOnlyStr || startOnlyStr || "";
        const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const stringValueStr = typeof stringValue === "string" ? stringValue : "";
        const offsetNum = typeof offset === "number" ? offset : undefined;
        const stringStr = typeof string === "string" ? string : sanitized;

        let isInArray = false;
        if (offsetNum !== undefined && stringStr) {
          const beforeMatch = stringStr.substring(Math.max(0, offsetNum - 500), offsetNum);
          isInArray = isInArrayContext(beforeMatch);
        }

        const isValidDelimiter =
          combinedDelimiter === "" ||
          combinedDelimiter === "\n" ||
          /[}\],]/.test(combinedDelimiter);

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

        const isAfterCommaInArrayLikeContext =
          (delimiterWithNewlineStr === "," || delimiterStr === ",") &&
          !isInsideString &&
          isValidDelimiter;

        if ((isInArray || isAfterCommaInArrayLikeContext) && !isInsideString && isValidDelimiter) {
          hasChanges = true;
          const isNonASCII = /[\u0080-\uFFFF]/.test(strayTextStr);
          const textType = isNonASCII ? "non-ASCII" : "ASCII";
          diagnostics.push(
            `Removed ${textType} stray text "${strayTextStr}" before array element "${stringValueStr.substring(0, 50)}${stringValueStr.length > 50 ? "..." : ""}"`,
          );
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

    // Pattern 3e: Remove file paths and image references before array string values
    // Pattern: `images/validation/OIG4.9HS_X.8.jpeg    "java.util.List",` -> `"java.util.List",`
    const filePathBeforeArrayValuePattern =
      /([}\],]|\n|^)(\s*)([a-zA-Z0-9_./-]+\.(jpeg|jpg|png|gif|svg|pdf|txt|md|json|yaml|yml|xml|html|css|js|ts|py|java|go|rs|cpp|c|h|hpp))\s+"([^"]+)"\s*,/g;
    sanitized = sanitized.replace(
      filePathBeforeArrayValuePattern,
      (match, delimiter, whitespace, filePath, _extension, stringValue, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        const isInArray = isInArrayContext(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const stringValueStr = typeof stringValue === "string" ? stringValue : "";
          const filePathStr = typeof filePath === "string" ? filePath : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed file path "${filePathStr}" before array element "${stringValueStr.substring(0, 50)}${stringValueStr.length > 50 ? "..." : ""}"`,
            );
          }
          return `${delimiterStr}${whitespaceStr}"${stringValueStr}",`;
        }

        return match;
      },
    );

    // ===== Pattern 4: Remove stray lines between structures =====
    const precisePattern = /([}\],]|",)(\s*)\n(\s*)([^"{}[\n]+)\n(\s*)([{"[])/g;

    sanitized = sanitized.replace(
      precisePattern,
      (
        match,
        delimiter,
        whitespaceBefore,
        strayLineWhitespace,
        strayLineContent,
        whitespaceAfter,
        nextToken,
      ) => {
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const whitespaceBeforeStr = typeof whitespaceBefore === "string" ? whitespaceBefore : "";
        const strayLineWhitespaceStr =
          typeof strayLineWhitespace === "string" ? strayLineWhitespace : "";
        const strayLineContentStr = typeof strayLineContent === "string" ? strayLineContent : "";
        const whitespaceAfterStr = typeof whitespaceAfter === "string" ? whitespaceAfter : "";
        const nextTokenStr = typeof nextToken === "string" ? nextToken : "";

        const fullStrayLine = strayLineWhitespaceStr + strayLineContentStr;
        const trimmedStrayLine = fullStrayLine.trim();
        const startsWithValidJsonToken = /^["{}[\]]/.test(trimmedStrayLine);
        const isIndentedJson = /^\s+["{[]/.test(fullStrayLine);
        const isJustWhitespace = /^\s*$/.test(fullStrayLine);

        if (startsWithValidJsonToken || isJustWhitespace || isIndentedJson) {
          return match;
        }

        const isValidDelimiter = /[}\],]|",/.test(delimiterStr);
        const isValidNextToken = /[{"[]/.test(nextTokenStr);

        if (isValidDelimiter && isValidNextToken) {
          hasChanges = true;
          const displayLine =
            trimmedStrayLine.length > 60
              ? `${trimmedStrayLine.substring(0, 57)}...`
              : trimmedStrayLine;
          diagnostics.push(`Removed stray line: "${displayLine}"`);
          return `${delimiterStr}${whitespaceBeforeStr}\n${whitespaceAfterStr}${nextTokenStr}`;
        }

        return match;
      },
    );

    const delimiterCommaPattern = /([}\]]\s*,\s*)\n(\s*)([^"{}[\n]+)\n(\s*)([{"[])/g;

    sanitized = sanitized.replace(
      delimiterCommaPattern,
      (
        match,
        delimiterComma,
        strayLineWhitespace,
        strayLineContent,
        whitespaceAfter,
        nextToken,
      ) => {
        const delimiterCommaStr = typeof delimiterComma === "string" ? delimiterComma : "";
        const strayLineWhitespaceStr =
          typeof strayLineWhitespace === "string" ? strayLineWhitespace : "";
        const strayLineContentStr = typeof strayLineContent === "string" ? strayLineContent : "";
        const whitespaceAfterStr = typeof whitespaceAfter === "string" ? whitespaceAfter : "";
        const nextTokenStr = typeof nextToken === "string" ? nextToken : "";

        const fullStrayLine = strayLineWhitespaceStr + strayLineContentStr;
        const trimmedStrayLine = fullStrayLine.trim();
        const startsWithValidJsonToken = /^["{}[\]]/.test(trimmedStrayLine);
        const isIndentedJson = /^\s+["{[]/.test(fullStrayLine);
        const isJustWhitespace = /^\s*$/.test(fullStrayLine);

        if (startsWithValidJsonToken || isJustWhitespace || isIndentedJson) {
          return match;
        }

        const isValidDelimiterComma = /[}\]]\s*,\s*$/.test(delimiterCommaStr);
        const isValidNextToken = /[{"[]/.test(nextTokenStr);

        if (isValidDelimiterComma && isValidNextToken) {
          hasChanges = true;
          const displayLine =
            trimmedStrayLine.length > 60
              ? `${trimmedStrayLine.substring(0, 57)}...`
              : trimmedStrayLine;
          diagnostics.push(`Removed stray line: "${displayLine}"`);
          return `${delimiterCommaStr}\n${whitespaceAfterStr}${nextTokenStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 4.5: Remove stray key-value pairs in arrays =====
    // Pattern: Removes property-like structures (KEY: "value",) that appear in arrays
    // Example: `"item1",\nLAGACY_CODE_REFACTOR_TOOLING: "2024-05-22",\n"item2"` -> `"item1",\n"item2"`
    const strayKeyValueInArrayPattern =
      /([}\],]|\n|^)(\s*)([A-Z_][A-Z0-9_]*)\s*:\s*"([^"]+)"\s*,(\s*\n)/g;
    sanitized = sanitized.replace(
      strayKeyValueInArrayPattern,
      (match, delimiter, _whitespace, key, value, afterComma, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        // Check if we're in an array context
        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        const isInArray = isInArrayContext(beforeMatch);

        if (isInArray) {
          hasChanges = true;
          const keyStr = typeof key === "string" ? key : "";
          const valueStr = typeof value === "string" ? value : "";
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const afterCommaStr = typeof afterComma === "string" ? afterComma : "";
          if (diagnostics.length < 10) {
            diagnostics.push(
              `Removed stray key-value pair in array: ${keyStr}: "${valueStr.substring(0, 30)}${valueStr.length > 30 ? "..." : ""}"`,
            );
          }
          // Remove the entire key-value pair, keeping the delimiter and newline
          return `${delimiterStr}${afterCommaStr}`;
        }

        return match;
      },
    );

    // ===== Pattern 5: Remove stray text before opening braces in array contexts =====
    const strayTextBeforeBracePattern = /([}\],])\s*\n\s*([a-zA-Z]{2,10})\{/g;

    sanitized = sanitized.replace(
      strayTextBeforeBracePattern,
      (match, delimiter, strayText, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const delimiterStr = typeof delimiter === "string" ? delimiter : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";

        if (isInStringAt(numericOffset, sanitized)) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, numericOffset - 500), numericOffset);
        const isInArray = isInArrayContext(beforeMatch);
        const isAfterArrayDelimiter = /[}\],]\s*\n\s*$/.test(beforeMatch);

        if (isInArray || isAfterArrayDelimiter) {
          const whitespaceMatch = /\n(\s*)[a-zA-Z]/.exec(match);
          const whitespaceAfterNewline = whitespaceMatch?.[1] ?? "    ";
          hasChanges = true;
          diagnostics.push(`Removed stray text "${strayTextStr}" before opening brace in array`);
          return `${delimiterStr}\n${whitespaceAfterNewline}{`;
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? SANITIZATION_STEP.REMOVED_INVALID_PREFIXES : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    console.warn(`removeInvalidPrefixes sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
