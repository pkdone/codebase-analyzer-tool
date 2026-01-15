import type { Sanitizer, SanitizerResult } from "./sanitizers-types";
import { logWarn } from "../../../utils/logging";
import { executeRulesMultiPass, ALL_RULES } from "./rules";

/**
 * Pattern to detect obvious errors that need fixing even in valid JSON.
 * This catches:
 * - Property names with embedded words: `"property word":`
 * - Binary corruption markers: `<x_bin_NNN>`
 * - Non-ASCII characters
 * - Assignment-style attributes: `_PROP_ = "value"`
 */
const OBVIOUS_ERRORS_PATTERN =
  /"[^"]+\s+[a-zA-Z]+\s*":|<x_bin_\d+|[\u0080-\uFFFF]|_[A-Z_]+\s*=\s*"/i;

/**
 * Checks if JSON content has obvious errors that need sanitization.
 *
 * @param input - The JSON string to check
 * @returns true if the content has obvious errors
 */
function hasObviousErrors(input: string): boolean {
  return OBVIOUS_ERRORS_PATTERN.test(input);
}

/**
 * Sanitizer that fixes various malformed JSON patterns found in LLM responses.
 *
 * This sanitizer uses a declarative rule-based system to handle:
 * 1. Extra single characters before properties (like `a  "propertyName":`)
 * 2. Corrupted property values (like `"propertyName":_CODE\`4,`)
 * 3. Invalid property names (like `extra_code_analysis:`)
 * 4. Duplicate closing braces at the end
 * 5. Missing quotes on property names (like `name":` instead of `"name":`)
 * 6. Non-ASCII characters in string values that break JSON parsing
 * 7. Malformed JSON structures and stray text
 * 8. YAML-like blocks embedded in JSON
 * 9. Java code appearing after JSON
 * 10. Binary corruption markers
 *
 * The rule-based architecture eliminates code duplication by:
 * - Centralizing isInStringAt checking
 * - Managing diagnostics collection automatically
 * - Providing context information to rules
 * - Supporting multi-pass execution for complex fixes
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
      if (!hasObviousErrors(input)) {
        // Valid JSON with no obvious errors, return as-is
        return { content: input, changed: false };
      }
      // Valid JSON but has errors, proceed with sanitization
    } catch {
      // Not valid JSON, proceed with sanitization
    }

    // Execute all rules with multi-pass enabled for thorough sanitization
    const result = executeRulesMultiPass(input, ALL_RULES, {
      maxDiagnostics: 20,
      maxPasses: 5,
    });

    if (!result.changed) {
      return { content: input, changed: false };
    }

    return {
      content: result.content,
      changed: true,
      description: "Fixed malformed JSON patterns",
      repairs: result.repairs?.length ? [...result.repairs] : undefined,
    };
  } catch (error) {
    logWarn(`fixMalformedJsonPatterns sanitizer failed: ${String(error)}`);
    return {
      content: input,
      changed: false,
      description: undefined,
      repairs: [`Sanitizer failed: ${String(error)}`],
    };
  }
};
