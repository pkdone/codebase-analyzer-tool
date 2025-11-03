import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";
import { DELIMITERS } from "../config/json-processing.config";

/**
 * Sanitizer that fixes common property name typos in JSON responses.
 *
 * This sanitizer addresses cases where LLM responses contain property names
 * with common typos that cause schema validation failures, such as:
 * - Trailing underscores: {"type_": "String"} -> {"type": "String"}
 * - Double underscores: {"property__name": "value"} -> {"property_name": "value"}
 *
 * The sanitizer is conservative and only fixes known problematic patterns
 * to avoid changing valid property names that might legitimately contain underscores.
 *
 * Strategy:
 * 1. Detects quoted property names followed by colons
 * 2. Applies typo corrections for common patterns
 * 3. Only fixes when the pattern matches a known typo (not all underscores)
 */
export const fixPropertyNameTypos: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    /**
     * Helper to determine if a position is inside a string literal.
     * This prevents us from modifying property names that appear as values.
     */
    function isInStringAt(position: number, content: string): boolean {
      let inString = false;
      let escaped = false;

      for (let i = 0; i < position; i++) {
        const char = content[i];

        if (escaped) {
          escaped = false;
          continue;
        }

        if (char === DELIMITERS.BACKSLASH) {
          escaped = true;
        } else if (char === DELIMITERS.DOUBLE_QUOTE) {
          inString = !inString;
        }
      }

      return inString;
    }

    /**
     * Known property name corrections based on common typos.
     * Maps common typo patterns to their correct forms.
     */
    const propertyTypoCorrections: Record<string, string> = {
      // Trailing underscore typos for common properties
      type_: "type",
      name_: "name",
      value_: "value",
      purpose_: "purpose",
      description_: "description",
      parameters_: "parameters",
      returnType_: "returnType",
      cyclomaticComplexity_: "cyclomaticComplexity",
      linesOfCode_: "linesOfCode",
      codeSmells_: "codeSmells",
      implementation_: "implementation",
      namespace_: "namespace",
      kind_: "kind",
      internalReferences_: "internalReferences",
      externalReferences_: "externalReferences",
      publicConstants_: "publicConstants",
      publicMethods_: "publicMethods",
      integrationPoints_: "integrationPoints",
      databaseIntegration_: "databaseIntegration",
      dataInputFields_: "dataInputFields",
      codeQualityMetrics_: "codeQualityMetrics",
    };

    // Pattern to match quoted property names followed by colons
    // Matches: "propertyName": where propertyName may contain typos
    const quotedPropertyPattern = /"([^"]+)"\s*:/g;

    sanitized = sanitized.replace(
      quotedPropertyPattern,
      (match, propertyName: unknown, offset: unknown) => {
        const numericOffset = typeof offset === "number" ? offset : 0;
        const propertyNameStr = typeof propertyName === "string" ? propertyName : "";

        // Check if we're inside a string literal (this would be a property value, not name)
        if (isInStringAt(numericOffset, sanitized)) {
          return match; // Keep as is - inside a string value
        }

        // Check if the property name has a trailing underscore (common typo)
        if (propertyNameStr.endsWith("_") && propertyNameStr.length > 1) {
          const correctedName = propertyNameStr.slice(0, -1); // Remove trailing underscore
          // Only fix if it matches a known typo pattern or is a common property
          if (
            propertyTypoCorrections[propertyNameStr] ||
            correctedName in propertyTypoCorrections ||
            correctedName.length > 2 // Conservative: only fix if removing underscore leaves a reasonable name
          ) {
            hasChanges = true;
            const finalName = propertyTypoCorrections[propertyNameStr] || correctedName;
            diagnostics.push(
              `Fixed property name typo with trailing underscore: "${propertyNameStr}" -> "${finalName}"`,
            );
            return `"${finalName}":`;
          }
        }

        // Check if the property name has double underscores (common typo)
        if (propertyNameStr.includes("__")) {
          const correctedName = propertyNameStr.replace(/__+/g, "_"); // Replace multiple underscores with single
          hasChanges = true;
          diagnostics.push(
            `Fixed property name typo with double underscores: "${propertyNameStr}" -> "${correctedName}"`,
          );
          return `"${correctedName}":`;
        }

        // Check if the property name matches a known typo correction
        if (propertyTypoCorrections[propertyNameStr]) {
          hasChanges = true;
          diagnostics.push(
            `Fixed known property name typo: "${propertyNameStr}" -> "${propertyTypoCorrections[propertyNameStr]}"`,
          );
          return `"${propertyTypoCorrections[propertyNameStr]}":`;
        }

        return match; // Keep as is - no typo detected
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges
        ? SANITIZATION_STEP.FIXED_PROPERTY_NAME_TYPOS
        : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixPropertyNameTypos sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};

