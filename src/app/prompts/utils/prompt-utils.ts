/**
 * Utility functions for building and formatting database-related prompt instructions.
 */

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
