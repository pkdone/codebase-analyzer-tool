/**
 * Utility functions for building structured instruction blocks for LLM prompts.
 *
 * This module contains pure utility functions that can be safely imported by both
 * the source config factories and the language-specific fragments without creating
 * circular dependencies.
 */

import { INSTRUCTION_SECTION_TITLES, type InstructionSectionTitle } from "../../prompts.constants";

// Re-export for consumers that import from this module
export { INSTRUCTION_SECTION_TITLES, type InstructionSectionTitle };

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
 * Creates database mechanism mapping instructions by combining the base prefix,
 * language-specific examples, and the base suffix.
 *
 * This function is extracted to a separate utility module to avoid circular dependencies
 * between the source config factories (which aggregate fragments) and the language-specific
 * fragments (which use this helper to build their DB mechanism mappings).
 *
 * @param examples - Array of language-specific database mechanism examples
 * @param additionalNote - Optional additional note to append (e.g., Java's JMS/JNDI note)
 * @returns A formatted string with the complete DB mechanism mapping instructions
 */
export function createDbMechanismInstructions(
  examples: readonly string[],
  additionalNote?: string,
): string {
  const BASE_DB_MECHANISM_PREFIX = `    - mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:`;
  const BASE_DB_MECHANISM_SUFFIX = `      - Otherwise, if the code does not use a database => mechanism: 'NONE'`;
  const parts = [BASE_DB_MECHANISM_PREFIX, ...examples, BASE_DB_MECHANISM_SUFFIX];
  if (additionalNote) {
    parts.push(additionalNote);
  }
  return parts.join("\n");
}
