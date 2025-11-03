import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes tail-end truncated property names with missing opening quotes.
 *
 * This sanitizer addresses cases where LLM responses contain property names where:
 * - The opening quote is missing
 * - The beginning of the property name is missing (truncated)
 * - Only the tail-end of the property name remains with a closing quote
 *
 * Examples of issues this sanitizer handles:
 * - `alues": [` -> `"publicMethods": [` (missing opening quote and "publicMeth" prefix)
 * - `ntants": [` -> `"publicConstants": [` (missing opening quote and "publicCo" prefix)
 * - `egrationPoints": [` -> `"integrationPoints": [` (missing opening quote and "int" prefix)
 *
 * Strategy:
 * Uses a mapping of common tail-end truncations to full property names to restore
 * the complete property name with proper quoting. This is especially important for
 * schema properties that appear frequently in JSON responses.
 */
export const fixTailEndTruncatedProperties: Sanitizer = (
  jsonString: string,
): SanitizerResult => {
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

    // Mapping of tail-end truncations to full property names
    // These are common property names from the JSON schema that might be truncated
    // Format: tail-end -> full property name
    const tailEndMappings: Record<string, string> = {
      // publicMethods truncations
      alues: "publicMethods", // "publicMethods" -> "alues"
      ethods: "publicMethods", // "publicMethods" -> "ethods" (less likely but possible)
      thods: "publicMethods", // "publicMethods" -> "thods"
      // publicConstants truncations
      nstants: "publicConstants", // "publicConstants" -> "nstants"
      stants: "publicConstants", // "publicConstants" -> "stants"
      ants: "publicConstants", // "publicConstants" -> "ants"
      // integrationPoints truncations
      egrationPoints: "integrationPoints", // "integrationPoints" -> "egrationPoints"
      grationPoints: "integrationPoints", // "integrationPoints" -> "grationPoints"
      rationPoints: "integrationPoints", // "integrationPoints" -> "rationPoints"
      ationPoints: "integrationPoints", // "integrationPoints" -> "ationPoints"
      // internalReferences truncations (keep only the most specific ones)
      ernalReferences: "internalReferences", // "internalReferences" -> "ernalReferences" (unique to internal)
      // externalReferences truncations (alReferences is most common and unique)
      alReferences: "externalReferences", // "externalReferences" -> "alReferences" (most common and unique)
      // Note: "rnalReferences" and "nalReferences" are ambiguous between internal and external,
      // so we don't include them to avoid false positives
      // databaseIntegration truncations
      aseIntegration: "databaseIntegration", // "databaseIntegration" -> "aseIntegration"
      seIntegration: "databaseIntegration", // "databaseIntegration" -> "seIntegration"
      // codeQualityMetrics truncations
      QualityMetrics: "codeQualityMetrics", // "codeQualityMetrics" -> "QualityMetrics"
      qualityMetrics: "codeQualityMetrics", // "codeQualityMetrics" -> "qualityMetrics"
      // Common method/parameter truncations
      ameters: "parameters", // "parameters" -> "ameters"
      meters: "parameters", // "parameters" -> "meters"
      eters: "parameters", // "parameters" -> "eters"
      // Common truncations
      eferences: "references", // "references" -> "eferences"
      ferences: "references", // "references" -> "ferences"
    };

    // Pattern to match tail-end truncated property names with missing opening quote
    // Matches: tailEnd": (where tailEnd is a word ending with a quote)
    // Must be preceded by a delimiter (}, ], comma) or start of line/newline
    // This ensures we're at a property boundary
    const tailEndTruncatedPattern = /([}\],]|^|\n)(\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)"\s*:/gm;

    let previousSanitized = "";
    while (previousSanitized !== sanitized) {
      previousSanitized = sanitized;
      sanitized = sanitized.replace(
        tailEndTruncatedPattern,
        (match, delimiter, whitespace, tailEnd, offset: unknown) => {
          const numericOffset = typeof offset === "number" ? offset : 0;
          const delimiterStr = typeof delimiter === "string" ? delimiter : "";
          const whitespaceStr = typeof whitespace === "string" ? whitespace : "";
          const tailEndStr = typeof tailEnd === "string" ? tailEnd : "";

          // Check if we're inside a string literal at the match position
          if (isInStringAt(numericOffset, sanitized)) {
            return match; // Keep as is - inside a string
          }

          // Check if there's already an opening quote before the tail-end
          const matchStart = numericOffset + (delimiterStr === "\n" ? 1 : 0);
          if (matchStart > 0 && sanitized[matchStart - 1] === '"') {
            // Check if the delimiter is actually part of a closing quote
            const beforeDelimiter = sanitized.substring(Math.max(0, matchStart - 2), matchStart);
            if (!beforeDelimiter.endsWith('"')) {
              return match; // Already has opening quote
            }
          }

          // Look up the tail-end in our mappings
          if (tailEndMappings[tailEndStr]) {
            const fullPropertyName = tailEndMappings[tailEndStr];
            hasChanges = true;
            diagnostics.push(
              `Fixed tail-end truncated property: ${tailEndStr}" -> "${fullPropertyName}"`,
            );

            // Reconstruct with proper property name and opening quote
            return `${delimiterStr}${whitespaceStr}"${fullPropertyName}":`;
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
      description: hasChanges
        ? SANITIZATION_STEP.FIXED_TAIL_END_TRUNCATED_PROPERTIES
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixTailEndTruncatedProperties sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

