import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes unquoted string values in JSON responses.
 *
 * This sanitizer addresses cases where LLM responses contain string values
 * without double quotes after a colon, which is invalid JSON syntax.
 *
 * Examples of issues this sanitizer handles:
 * - `"name":GetChargeCalculation",` -> `"name": "GetChargeCalculation",`
 * - `"type":String,` -> `"type": "String",`
 * - `"returnType":CommandProcessingResult` -> `"returnType": "CommandProcessingResult"`
 *
 * Strategy:
 * Detects patterns where after a colon (optionally with whitespace), there's an identifier
 * (word characters) that appears to be a string value (not a number, boolean, or null).
 * The sanitizer adds quotes around these unquoted string values.
 *
 * Important: This sanitizer runs AFTER fixUnquotedPropertyNames to avoid conflicts,
 * and it carefully avoids modifying property names or already-quoted values.
 */
export const fixUnquotedStringValues: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
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

    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern to match unquoted string values after a quoted property name and colon
    // Matches: "propertyName":UnquotedValue or "propertyName": UnquotedValue
    // The value can be followed by: comma, closing brace/bracket, or stray quote+terminator
    const unquotedStringValuePattern =
      /"([a-zA-Z_$][a-zA-Z0-9_$.]*)"\s*:\s*([a-zA-Z_$][a-zA-Z0-9_$.]+)(\s*[,}\]]|"\s*[,}\]]|"\s*$|[,}\]]|$)/g;

    sanitized = sanitized.replace(
      unquotedStringValuePattern,
      (match, propertyName, unquotedValue, terminator, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";
        const unquotedValueStr = typeof unquotedValue === "string" ? unquotedValue : "";
        let terminatorStr = typeof terminator === "string" ? terminator : "";

        // Check if we're inside a string literal at the match position
        if (isInStringAt(numericOffset, sanitized)) {
          return match; // Keep as is - inside a string
        }

        // Skip if the value is a JSON keyword (these are valid unquoted)
        const jsonKeywords = ["true", "false", "null"];
        if (jsonKeywords.includes(unquotedValueStr.toLowerCase())) {
          return match;
        }

        // Remove stray quote from terminator if present
        if (terminatorStr.startsWith('"')) {
          terminatorStr = terminatorStr.substring(1);
        }

        // Verify this is actually after a colon (value context)
        // The pattern already ensures we're after a quoted property name and colon,
        // so we can proceed with fixing

        hasChanges = true;
        diagnostics.push(
          `Fixed unquoted string value: "${propertyNameStr}": ${unquotedValueStr} -> "${propertyNameStr}": "${unquotedValueStr}"`,
        );

        // Reconstruct with quoted value
        // Preserve whitespace after colon from original match
        const colonIndex = match.indexOf(":");
        const afterColon = match.substring(colonIndex + 1);
        const whitespaceRegex = /^\s*/;
        const whitespaceMatch = whitespaceRegex.exec(afterColon);
        const whitespaceAfterColon = whitespaceMatch ? whitespaceMatch[0] : " ";

        return `"${propertyNameStr}":${whitespaceAfterColon}"${unquotedValueStr}"${terminatorStr}`;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? SANITIZATION_STEP.FIXED_UNQUOTED_STRING_VALUES
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixUnquotedStringValues sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
