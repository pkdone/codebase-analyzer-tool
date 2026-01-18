/**
 * Source file-specific instruction utilities for building prompt instruction blocks.
 * This module provides type-safe wrappers around common utilities with
 * standardized section titles used in source code analysis prompts.
 */

/**
 * Standardized section titles for source file instruction-based prompts.
 * These constants ensure consistency and prevent typos across all source prompt definitions.
 */
export const INSTRUCTION_SECTION_TITLES = {
  BASIC_INFO: "Basic Information",
  CLASS_INFO: "Class Information",
  MODULE_INFO: "Module Information",
  PURPOSE_AND_IMPLEMENTATION: "Purpose and Implementation",
  REFERENCES: "References",
  REFERENCES_AND_DEPS: "References and Dependencies",
  PUBLIC_API: "Public API",
  USER_INPUT_FIELDS: "User Input Fields",
  INTEGRATION_POINTS: "Integration Points",
  DATABASE_INTEGRATION: "Database Integration",
  DATABASE_INTEGRATION_ANALYSIS: "Database Integration Analysis",
  CODE_QUALITY_METRICS: "Code Quality Metrics",
  UI_FRAMEWORK_DETECTION: "User Interface Framework",
  DEPENDENCIES: "Dependencies",
  DATABASE_OBJECTS: "Database Objects",
  SCHEDULED_JOBS: "Scheduled Jobs",
  INSTRUCTIONS: "Instructions",
} as const;

/**
 * Type representing the valid instruction section titles.
 */
export type InstructionSectionTitle =
  (typeof INSTRUCTION_SECTION_TITLES)[keyof typeof INSTRUCTION_SECTION_TITLES];

/**
 * Builds a formatted instruction block from a title and a list of instruction parts.
 * The title is formatted with double underscores (__title__) and followed by a newline,
 * then all parts are joined with newlines.
 *
 * @param title - The title for the instruction block (must be a valid InstructionSectionTitle)
 * @param parts - Variable number of instruction parts, which can be strings or readonly string arrays
 * @returns A single formatted string with the title and joined parts
 *
 * @example
 * ```typescript
 * buildInstructionBlock(
 *   INSTRUCTION_SECTION_TITLES.BASIC_INFO,
 *   ["Extract name", "Extract kind"],
 *   "Additional instruction"
 * )
 * // Returns: "__Basic Information__\nExtract name\nExtract kind\nAdditional instruction"
 * ```
 */
export function buildInstructionBlock(
  title: InstructionSectionTitle,
  ...parts: (string | readonly string[])[]
): string {
  const flattenedParts = parts.flat();
  const formattedTitle = `__${title}__`;

  if (flattenedParts.length === 0) {
    return formattedTitle;
  }
  return `${formattedTitle}\n${flattenedParts.join("\n")}`;
}

/**
 * Base instruction for database mechanism mapping.
 * This is the common prefix used across all language-specific DB mechanism mappings.
 */
const BASE_DB_MECHANISM_PREFIX =
  `    - mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:` as const;

/**
 * Base suffix for database mechanism mapping.
 * This is the common ending used across all language-specific DB mechanism mappings.
 */
const BASE_DB_MECHANISM_SUFFIX =
  `      - Otherwise, if the code does not use a database => mechanism: 'NONE'` as const;

/**
 * Creates database mechanism mapping instructions by combining the base prefix,
 * language-specific examples, and the base suffix.
 *
 * @param examples - Array of language-specific database mechanism examples
 * @param additionalNote - Optional additional note to append (e.g., Java's JMS/JNDI note)
 * @returns A formatted string with the complete DB mechanism mapping instructions
 */
export function createDbMechanismInstructions(
  examples: readonly string[],
  additionalNote?: string,
): string {
  const parts = [BASE_DB_MECHANISM_PREFIX, ...examples, BASE_DB_MECHANISM_SUFFIX];
  if (additionalNote) {
    parts.push(additionalNote);
  }
  return parts.join("\n");
}
