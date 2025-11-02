/**
 * Constants for sanitization step descriptions.
 * These constants ensure consistency across the codebase and prevent typos.
 * They are used by sanitizers to describe what modifications were made to the JSON response.
 */

/**
 * Fixed step descriptions (no dynamic content)
 */
export const SANITIZATION_STEP = Object.freeze({
  TRIMMED_WHITESPACE: "Trimmed whitespace",
  REMOVED_CODE_FENCES: "Removed code fences",
  REMOVED_CONTROL_CHARS: "Removed control / zero-width characters",
  EXTRACTED_LARGEST_JSON_SPAN: "Extracted largest JSON span",
  UNWRAPPED_JSON_SCHEMA: "Unwrapped JSON Schema to extract properties",
  COLLAPSED_DUPLICATE_JSON: "Collapsed duplicated identical JSON object",
  REMOVED_TRAILING_COMMAS: "Removed trailing commas",
  FIXED_OVER_ESCAPED_SEQUENCES: "Fixed over-escaped sequences",
  COMPLETED_TRUNCATED_STRUCTURES: "Completed truncated JSON structures",
  FIXED_UNESCAPED_QUOTES_IN_STRINGS: "Fixed unescaped quotes in string values",
  FIXED_STRAY_TEXT_BEFORE_PROPERTY_NAMES: "Fixed stray text concatenated before property names",
  FIXED_STRAY_CHARS_AFTER_PROPERTY_VALUES: "Fixed stray characters concatenated after property values",
} as const);

/**
 * Functions for generating dynamic step descriptions with counts
 */
export const SANITIZATION_STEP_TEMPLATE = Object.freeze({
  /**
   * Generate description for fixed concatenation chains
   * @param count - Number of concatenation chains fixed
   * @returns Description string with proper pluralization
   */
  fixedConcatenationChains: (count: number): string =>
    `Fixed ${count} concatenation chain${count !== 1 ? "s" : ""}`,

  /**
   * Generate description for added missing commas
   * @param count - Number of commas added
   * @returns Description string with proper pluralization
   */
  addedMissingCommas: (count: number): string =>
    `Added ${count} missing comma${count !== 1 ? "s" : ""} between properties`,

  /**
   * Generate description for fixed mismatched delimiters
   * @param count - Number of delimiters fixed
   * @returns Description string with proper pluralization
   */
  fixedMismatchedDelimiters: (count: number): string =>
    `Fixed ${count} mismatched delimiter${count !== 1 ? "s" : ""}`,
} as const);

/**
 * Set of sanitization steps that are considered "insignificant" for mutation tracking.
 * These steps represent trivial formatting changes that don't indicate problematic LLM output.
 */
const insignificantSteps = new Set([
  SANITIZATION_STEP.TRIMMED_WHITESPACE,
  SANITIZATION_STEP.REMOVED_CODE_FENCES,
]);
// Freeze the Set to prevent modifications
insignificantSteps.add = () => {
  throw new Error("Set is readonly");
};
insignificantSteps.delete = () => {
  throw new Error("Set is readonly");
};
insignificantSteps.clear = () => {
  throw new Error("Set is readonly");
};
export const INSIGNIFICANT_SANITIZATION_STEPS: ReadonlySet<string> = insignificantSteps;

/**
 * Type helper for sanitization step descriptions
 */
export type SanitizationStepDescription = string;
