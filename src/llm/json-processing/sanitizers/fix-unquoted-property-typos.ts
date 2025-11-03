import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";
import { DELIMITERS } from "../config/json-processing.config";

/**
 * Sanitizer that fixes property names with missing opening quotes where the property name
 * is a known typo for a valid schema property.
 *
 * This sanitizer addresses cases where LLM responses contain property names that:
 * - Are missing the opening quote
 * - Are typos of valid property names (e.g., "extraReferences" instead of "externalReferences")
 *
 * Examples of issues this sanitizer handles:
 * - `extraReferences": [` -> `"externalReferences": [`
 * - `internReferences": [` -> `"internalReferences": [`
 * - `publMethods": [` -> `"publicMethods": [`
 *
 * Strategy:
 * Uses a mapping of common property name typos (without quotes) to their correct forms
 * to fix both the missing quote and the typo. This is important because the existing
 * `fixUnquotedPropertyNames` sanitizer adds quotes but doesn't fix typos, and
 * `fixPropertyNameTypos` only works on already-quoted properties.
 */
export const fixUnquotedPropertyTypos: Sanitizer = (jsonString: string): SanitizerResult => {
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

    // Mapping of common property name typos (without opening quote) to correct property names
    // These are patterns where the property name is a typo AND missing the opening quote
    const unquotedPropertyTypoMappings: Record<string, string> = {
      // externalReferences typos
      extraReferences: "externalReferences", // "extra" instead of "external"
      exterReferences: "externalReferences",
      externReferences: "externalReferences",
      externalRefs: "externalReferences",
      externalRef: "externalReferences",
      // internalReferences typos
      internReferences: "internalReferences", // "intern" instead of "internal"
      internalRefs: "internalReferences",
      internalRef: "internalReferences",
      // publicMethods typos
      publMethods: "publicMethods", // "publ" instead of "public"
      publicMeth: "publicMethods",
      publicMeths: "publicMethods",
      // publicConstants typos
      publConstants: "publicConstants",
      publicConst: "publicConstants",
      publicConsts: "publicConstants",
      // integrationPoints typos
      integrationPt: "integrationPoints",
      integrationPts: "integrationPoints",
      integPoints: "integrationPoints",
      // databaseIntegration typos
      dbIntegration: "databaseIntegration",
      databaseInteg: "databaseIntegration",
      // codeQualityMetrics typos
      qualityMetrics: "codeQualityMetrics",
      codeMetrics: "codeQualityMetrics",
      codeQuality: "codeQualityMetrics",
    };

    // Pattern to match property names with missing opening quote that might be typos
    // Matches: propertyName": (where propertyName is a word starting with a letter)
    // Must be preceded by a delimiter (}, ], comma) or start of line/newline
    // This ensures we're at a property boundary
    const unquotedPropertyTypoPattern = /([}\],]|^|\n)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/gm;

    let previousSanitized = "";
    while (previousSanitized !== sanitized) {
      previousSanitized = sanitized;
      sanitized = sanitized.replace(
        unquotedPropertyTypoPattern,
        (match, delimiter, whitespace, propertyName, offset: unknown) => {
          const numericOffset = typeof offset === "number" ? offset : 0;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

          // Check if we're inside a string literal at the match position
          if (isInStringAt(numericOffset, sanitized)) {
            return match; // Keep as is - inside a string
          }

          // Check if there's already an opening quote before the property name
          const matchStart = numericOffset + (delimiterStr === "\n" ? 1 : 0);
          if (matchStart > 0 && sanitized[matchStart - 1] === DELIMITERS.DOUBLE_QUOTE) {
            // Check if the delimiter is actually part of a closing quote
            const beforeDelimiter = sanitized.substring(Math.max(0, matchStart - 2), matchStart);
            if (!beforeDelimiter.endsWith('"')) {
              return match; // Already has opening quote
            }
          }

          // Look up the property name in our typo mappings
          if (unquotedPropertyTypoMappings[propertyNameStr]) {
            const correctPropertyName = unquotedPropertyTypoMappings[propertyNameStr];
            hasChanges = true;
            diagnostics.push(
              `Fixed unquoted property typo: ${propertyNameStr}" -> "${correctPropertyName}"`,
            );

            // Reconstruct with correct property name and opening quote
            return `${delimiterStr}${whitespaceStr}"${correctPropertyName}":`;
          }

          return match; // Keep as is if no mapping found
        },
      );
    }

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? SANITIZATION_STEP.FIXED_UNQUOTED_PROPERTY_TYPOS : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixUnquotedPropertyTypos sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

