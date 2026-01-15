/**
 * Constants for repair step descriptions.
 * These constants ensure consistency across the codebase and prevent typos.
 * They are used by sanitizers and transforms to describe what modifications were made to the JSON response.
 *
 * IMPORTANT: All sanitizer and transform code MUST use these constants instead of hardcoded strings
 * to ensure consistency and allow proper categorization of insignificant steps.
 *
 * Repair steps include:
 * - Sanitization repairs: Fixes applied during JSON parsing (removing noise, fixing syntax)
 * - Transform repairs: Fixes applied during schema validation (type coercion, property fixes)
 */

/**
 * Fixed step descriptions for repairs (no dynamic content)
 */
export const REPAIR_STEP = Object.freeze({
  // ============================================
  // SANITIZATION REPAIRS (applied during parsing)
  // ============================================

  // Whitespace and formatting
  TRIMMED_WHITESPACE: "Trimmed whitespace",
  REMOVED_CODE_FENCES: "Removed code fences",
  REMOVED_CONTROL_CHARS: "Removed control / zero-width characters",

  // Structure extraction and deduplication
  EXTRACTED_LARGEST_JSON_SPAN: "Extracted largest JSON span",
  COLLAPSED_DUPLICATE_JSON: "Collapsed duplicate JSON object",

  // Trailing/truncation fixes
  REMOVED_TRAILING_COMMAS: "Removed trailing commas",
  REMOVED_TRUNCATION_MARKERS: "Removed truncation markers (e.g., ...)",
  COMPLETED_TRUNCATED_STRUCTURES: "Completed truncated JSON structures",

  // Escape sequence fixes
  FIXED_OVER_ESCAPED_SEQUENCES: "Fixed over-escaped sequences",
  FIXED_INVALID_ESCAPE_SEQUENCES: "Fixed invalid escape sequences",
  NORMALIZED_ESCAPE_SEQUENCES: "Normalized escape sequences, control characters, and curly quotes",
  ESCAPED_CONTROL_CHARS_IN_STRINGS: "Escaped control characters in string values",

  // Quote fixes
  FIXED_CURLY_QUOTES: "Converted curly quotes (smart quotes) to regular ASCII quotes",
  FIXED_MISSING_OPENING_QUOTES_IN_ARRAY_STRINGS:
    "Fixed missing opening quotes in array string values",

  // Stray text/character fixes
  FIXED_STRAY_CHARS_AFTER_PROPERTY_VALUES:
    "Fixed stray characters concatenated after property values",

  // Assignment and syntax fixes
  FIXED_ASSIGNMENT_SYNTAX: "Fixed assignment syntax (:= to :)",

  // LLM artifact removal
  REMOVED_THOUGHT_MARKERS: "Removed thought markers and text before JSON",
  REMOVED_CONTROL_THOUGHT_MARKER: "Removed control-style thought marker",
  REMOVED_LLM_INSTRUCTION_TEXT: "Removed LLM instruction text appended after JSON",
  REMOVED_EXTRA_JSON_AFTER_MAIN: "Removed extra JSON/schema after main structure",
  FIXED_LLM_TOKEN_ARTIFACTS:
    "Fixed LLM token artifacts (e.g., <y_bin_XXX> markers and stray text before braces)",

  // Property name fixes
  FIXED_PROPERTY_NAME_TYPOS: "Fixed property name typos (trailing underscores, double underscores)",
  FIXED_DANGLING_PROPERTIES: "Fixed dangling properties (added null values)",

  // Array element fixes
  FIXED_TRUNCATED_ARRAY_ELEMENTS:
    "Fixed truncated array elements (missing opening brace and property name)",
  FIXED_CORRUPTED_ARRAY_OBJECT_START:
    "Fixed corrupted array object start (missing opening brace and property name with stray text)",
  FIXED_UNCLOSED_ARRAY: "Fixed unclosed array before property name",
  FIXED_TRUNCATED_PROPERTY_VALUES_IN_ARRAYS: "Fixed truncated property values in array elements",

  // Value fixes
  FIXED_UNQUOTED_STRING_VALUES: "Fixed unquoted string values",
  FIXED_TRUNCATED_PROPERTY_VALUES: "Fixed truncated property values (missing colon and value)",
  FIXED_CORRUPTED_PROPERTY_VALUE_PAIRS: "Fixed corrupted property/value pairs",
  CONVERTED_UNDEFINED_TO_NULL: "Converted undefined to null",

  // ============================================
  // TRANSFORM REPAIRS (applied during validation)
  // ============================================

  // These match the function names used in json-validating.ts transforms
  TRANSFORM_REMOVE_INCOMPLETE_ARRAY_ITEMS: "removeIncompleteArrayItems",
  TRANSFORM_COERCE_STRING_TO_ARRAY: "coerceStringToArray",
  TRANSFORM_CONVERT_NULL_TO_UNDEFINED: "convertNullToUndefined",
  TRANSFORM_FIX_COMMON_PROPERTY_NAME_TYPOS: "fixCommonPropertyNameTypos",
  TRANSFORM_COERCE_NUMERIC_PROPERTIES: "coerceNumericProperties",
  TRANSFORM_UNWRAP_JSON_SCHEMA_STRUCTURE: "unwrapJsonSchemaStructure",
} as const);

/**
 * Functions for generating dynamic repair descriptions with counts
 */
export const REPAIR_STEP_TEMPLATE = Object.freeze({
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
 * Set of repair steps that are considered "insignificant" for repair tracking.
 * These steps represent trivial formatting changes that don't indicate problematic LLM output.
 *
 * Note: Only sanitization repairs can be insignificant. All transform repairs are significant
 * because they indicate schema mismatches that are worth monitoring.
 */
export const INSIGNIFICANT_REPAIR_STEPS: ReadonlySet<string> = new Set([
  REPAIR_STEP.TRIMMED_WHITESPACE,
  REPAIR_STEP.REMOVED_CODE_FENCES,
]);
