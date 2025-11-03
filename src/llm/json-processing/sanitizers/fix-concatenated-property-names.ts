import { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { SANITIZATION_STEP } from "../config/sanitization-steps.config";

/**
 * Sanitizer that fixes concatenated string literals in property names.
 *
 * This sanitizer addresses cases where LLM responses use string concatenation
 * in property names, which breaks JSON parsing.
 *
 * Examples of issues this sanitizer handles:
 * - `"cyclomati" + "cComplexity":` -> `"cyclomaticComplexity":`
 * - `"referen" + "ces":` -> `"references":`
 * - `"lines" + "OfCode":` -> `"linesOfCode":`
 *
 * Strategy:
 * Detects patterns where quoted strings are concatenated with + before a colon,
 * and merges them into a single property name by combining the string contents.
 */
export const fixConcatenatedPropertyNames: Sanitizer = (jsonString: string): SanitizerResult => {
  try {
    let sanitized = jsonString;
    let hasChanges = false;
    const diagnostics: string[] = [];

    // Pattern: quoted string + quoted string + ... followed by :
    // This matches concatenated quoted strings that form a property name
    // The pattern must be followed by a colon to indicate it's a property name
    // Matches: "part1" + "part2" + "part3": or "word1" + "word2":
    const concatenatedPropertyNamePattern = /"([^"]+)"\s*\+\s*"([^"]+)"(\s*\+\s*"[^"]+")*\s*:/g;

    sanitized = sanitized.replace(
      concatenatedPropertyNamePattern,
      (_match, firstPart, secondPart, additionalParts) => {
        // Extract all string parts
        const allParts: string[] = [firstPart as string, secondPart as string];

        // Extract any additional parts if present
        if (additionalParts) {
          const additionalMatches = (additionalParts as string).match(/"([^"]+)"/g);
          if (additionalMatches) {
            for (const additionalMatch of additionalMatches) {
              const content = additionalMatch.slice(1, -1); // Remove quotes
              allParts.push(content);
            }
          }
        }

        // Merge all parts into a single property name
        const mergedName = allParts.join("");

        hasChanges = true;
        diagnostics.push(
          `Merged concatenated property name: ${allParts.join('" + "')} -> ${mergedName}`,
        );

        return `"${mergedName}":`;
      },
    );

    // Ensure hasChanges reflects actual changes
    hasChanges = sanitized !== jsonString;

    return {
      content: sanitized,
      changed: hasChanges,
      description: hasChanges ? SANITIZATION_STEP.FIXED_CONCATENATED_PROPERTY_NAMES : undefined,
      diagnostics: hasChanges && diagnostics.length > 0 ? diagnostics : undefined,
    };
  } catch (error) {
    // If sanitization fails, return the original string
    console.warn(`fixConcatenatedPropertyNames sanitizer failed: ${String(error)}`);
    return {
      content: jsonString,
      changed: false,
      description: undefined,
      diagnostics: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
