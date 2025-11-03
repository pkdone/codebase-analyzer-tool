import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes corrupted array object starts where:
 * 1. A closing brace-comma `},` is followed by stray text before a quoted value
 * 2. The opening brace `{` and property name `"name":` are missing
 *
 * This sanitizer addresses cases where LLM responses corrupt the start of new objects
 * in arrays, particularly in structures like `publicMethods` arrays where each method
 * object should start with `{"name": "methodName", ...}` but instead gets corrupted to
 * something like `c"methodName",` or `e"methodName",`.
 *
 * Examples of issues this sanitizer handles:
 * - `},\nc"withdrawal",` -> `},\n    {\n      "name": "withdrawal",`
 * - `},\ne"calculateMethod",` -> `},\n    {\n      "name": "calculateMethod",`
 * - `},\nn"methodName",` -> `},\n    {\n      "name": "methodName",`
 * - `}, e"methodName",` -> `},\n    {\n      "name": "methodName",`
 *
 * Strategy:
 * Detects patterns where after a closing brace-comma `},` (optionally with whitespace/newline),
 * there's stray text (1-3 characters) directly before a quoted string that appears to be
 * a property value in an array context. The sanitizer then:
 * 1. Removes the stray text
 * 2. Inserts the missing opening brace `{`
 * 3. Inserts the missing property name `"name":`
 * 4. Preserves proper indentation based on context
 */
export const fixCorruptedArrayObjectStart: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern to match corrupted array object starts:
    // 1. Closing brace-comma `},` (optionally with whitespace before comma)
    // 2. Optional whitespace and newline
    // 3. Optional indentation whitespace
    // 4. Stray text (1-3 characters, typically single chars like 'c', 'e', 'n')
    // 5. Quoted string that looks like it should be a property value
    // 6. Comma after the quoted string
    //
    // The pattern captures:
    // - The closing brace-comma and following whitespace/newline
    // - The indentation before the stray text
    // - The stray text itself
    // - The quoted value string
    //
    // Note: We use a non-greedy match for the quoted string to ensure we capture the value
    // but stop at the comma. The stray text is limited to 1-3 characters to avoid false positives.
    const corruptedPattern =
      /(\}\s*,\s*)(\n?)(\s*)([a-zA-Z]{1,3})"([^"]+)"(\s*,)/g;

    sanitized = sanitized.replace(
      corruptedPattern,
      (match, braceComma, newline, indent, strayText, quotedValue, commaAfter) => {
        // Type assertions for regex match groups
        const braceCommaStr = typeof braceComma === "string" ? braceComma : "";
        const newlineStr = typeof newline === "string" ? newline : "";
        const indentStr = typeof indent === "string" ? indent : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const quotedValueStr = typeof quotedValue === "string" ? quotedValue : "";
        const commaAfterStr = typeof commaAfter === "string" ? commaAfter : "";

        // Verify we're in an array context by checking backwards
        // Look for an opening bracket `[` before the closing brace
        const matchIndex = sanitized.indexOf(match);
        if (matchIndex < 0) {
          return match;
        }

        const beforeMatch = sanitized.substring(Math.max(0, matchIndex - 500), matchIndex);

        // Count braces and brackets to determine if we're in an array of objects
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
              // If we've balanced braces and found a bracket, we're likely in an array of objects
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

        // Only fix if we're likely in an array context (found opening bracket)
        // and the stray text doesn't look like valid JSON
        const isLikelyArrayContext = foundOpeningBracket && openBrackets > 0;
        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

        if (isLikelyArrayContext && !isStrayTextValid) {
          hasChanges = true;

          // Determine proper indentation: use the existing indent if present,
          // otherwise use a standard 4 spaces (typical for JSON formatting)
          const properIndent = indentStr || "    ";
          const innerIndent = properIndent + "  "; // Indent for properties inside object

          diagnostics.push(
            `Fixed corrupted array object start: removed stray "${strayTextStr}" and inserted missing {"name": before "${quotedValueStr}"`,
          );

          // Reconstruct the fixed pattern:
          // - Keep the closing brace-comma
          // - Ensure newline is present
          // - Add proper indentation
          // - Add opening brace
          // - Add newline with inner indentation
          // - Add "name": property
          // - Add the quoted value
          // - Keep the comma after
          const ensuredNewline = newlineStr || "\n";
          return `${braceCommaStr}${ensuredNewline}${properIndent}{\n${innerIndent}"name": "${quotedValueStr}"${commaAfterStr}`;
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
        ? SANITIZATION_STEP.FIXED_CORRUPTED_ARRAY_OBJECT_START
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixCorruptedArrayObjectStart sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
