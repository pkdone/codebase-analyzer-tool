import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes corrupted array object starts where:
 * 1. A closing brace-comma `},` is followed by stray text before a quoted value OR property name
 * 2. The opening brace `{` is missing (and possibly the property name `"name":` if it's a value)
 *
 * This sanitizer addresses cases where LLM responses corrupt the start of new objects
 * in arrays, particularly in structures like `publicMethods` arrays where each method
 * object should start with `{"name": "methodName", ...}` but instead gets corrupted to
 * something like `c"methodName",` or `e"methodName",`.
 *
 * It also handles cases where the property name itself is present but the opening brace is missing,
 * such as `e"mechanism":` which should be `{\n      "mechanism":`.
 *
 * Examples of issues this sanitizer handles:
 * - `},\nc"withdrawal",` -> `},\n    {\n      "name": "withdrawal",` (stray text before value)
 * - `},\ne"calculateMethod",` -> `},\n    {\n      "name": "calculateMethod",` (stray text before value)
 * - `},\nn"methodName",` -> `},\n    {\n      "name": "methodName",` (stray text before value)
 * - `}, e"methodName",` -> `},\n    {\n      "name": "methodName",` (stray text before value)
 * - `},e"mechanism":` -> `},\n    {\n      "mechanism":` (stray text before property name)
 * - `},\ne"name":` -> `},\n    {\n      "name":` (stray text before property name)
 *
 * Strategy:
 * Detects patterns where after a closing brace-comma `},` (optionally with whitespace/newline),
 * there's stray text (1-3 characters) directly before a quoted string that appears to be
 * either a property value (followed by `,`) or a property name (followed by `:`) in an array context.
 * The sanitizer then:
 * 1. Removes the stray text
 * 2. Inserts the missing opening brace `{`
 * 3. If it's a property value (followed by `,`), inserts the missing property name `"name":`
 * 4. If it's a property name (followed by `:`), keeps the property name as is
 * 5. Preserves proper indentation based on context
 */
export const fixCorruptedArrayObjectStart: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern 1: Corrupted array object starts with stray text before a property value
    // Matches: }, strayText"value",
    // The pattern captures:
    // - The closing brace-comma and following whitespace/newline
    // - The indentation before the stray text
    // - The stray text itself
    // - The quoted value string
    // - Comma after the quoted string
    const corruptedPatternWithValue = /(\}\s*,\s*)(\n?)(\s*)([a-zA-Z]{1,3})"([^"]+)"(\s*,)/g;

    // Pattern 2: Corrupted array object starts with stray text before a property name
    // Matches: }, strayText"propertyName":
    // Similar to Pattern 1 but the quoted string is followed by `:` (property name) not `,` (value)
    // The pattern captures:
    // - The closing brace-comma and following whitespace/newline
    // - The indentation before the stray text
    // - The stray text itself
    // - The quoted property name string
    // - Colon after the quoted string
    const corruptedPatternWithPropertyName = /(\}\s*,\s*)(\n?)(\s*)([a-zA-Z]{1,3})"([^"]+)"(\s*:)/g;

    // Helper function to check if we're in an array context
    function isInArrayContext(matchIndex: number, content: string): boolean {
      const beforeMatch = content.substring(Math.max(0, matchIndex - 500), matchIndex);

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

      return foundOpeningBracket && openBrackets > 0;
    }

    // Pattern 1: Handle stray text before property values (needs "name": inserted)
    sanitized = sanitized.replace(
      corruptedPatternWithValue,
      (match, braceComma, newline, indent, strayText, quotedValue, commaAfter, offset: unknown) => {
        // Type assertions for regex match groups
        const braceCommaStr = typeof braceComma === "string" ? braceComma : "";
        const newlineStr = typeof newline === "string" ? newline : "";
        const indentStr = typeof indent === "string" ? indent : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const quotedValueStr = typeof quotedValue === "string" ? quotedValue : "";
        const commaAfterStr = typeof commaAfter === "string" ? commaAfter : "";
        const numericOffset = typeof offset === "number" ? offset : 0;

        // Verify we're in an array context by checking backwards
        const isLikelyArrayContext = isInArrayContext(numericOffset, sanitized);
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

    // Pattern 2: Handle stray text before property names (just needs { inserted)
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
        // Type assertions for regex match groups
        const braceCommaStr = typeof braceComma === "string" ? braceComma : "";
        const newlineStr = typeof newline === "string" ? newline : "";
        const indentStr = typeof indent === "string" ? indent : "";
        const strayTextStr = typeof strayText === "string" ? strayText : "";
        const quotedPropertyNameStr =
          typeof quotedPropertyName === "string" ? quotedPropertyName : "";
        const colonAfterStr = typeof colonAfter === "string" ? colonAfter : "";
        const numericOffset = typeof offset === "number" ? offset : 0;

        // Verify we're in an array context by checking backwards
        const isLikelyArrayContext = isInArrayContext(numericOffset, sanitized);
        const jsonKeywords = ["true", "false", "null", "undefined"];
        const isStrayTextValid = jsonKeywords.includes(strayTextStr.toLowerCase());

        if (isLikelyArrayContext && !isStrayTextValid) {
          hasChanges = true;

          // Determine proper indentation: use the existing indent if present,
          // otherwise use a standard 4 spaces (typical for JSON formatting)
          const properIndent = indentStr || "    ";
          const innerIndent = properIndent + "  "; // Indent for properties inside object

          diagnostics.push(
            `Fixed corrupted array object start: removed stray "${strayTextStr}" and inserted missing { before "${quotedPropertyNameStr}":`,
          );

          // Reconstruct the fixed pattern:
          // - Keep the closing brace-comma
          // - Ensure newline is present
          // - Add proper indentation
          // - Add opening brace
          // - Add newline with inner indentation
          // - Add the property name (already quoted)
          // - Keep the colon after
          const ensuredNewline = newlineStr || "\n";
          return `${braceCommaStr}${ensuredNewline}${properIndent}{\n${innerIndent}"${quotedPropertyNameStr}"${colonAfterStr}`;
        }

        return match;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? SANITIZATION_STEP.FIXED_CORRUPTED_ARRAY_OBJECT_START : undefined,
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
