/**
 * Utility functions for building and formatting prompt instructions.
 */

/**
 * Builds a formatted instruction block from a title and a list of instruction parts.
 * The title is formatted with double underscores (__title__) and followed by a newline,
 * then all parts are joined with newlines.
 *
 * @param title - The title for the instruction block (will be wrapped in __title__)
 * @param parts - Variable number of instruction parts, which can be strings or readonly string arrays
 * @returns A single formatted string with the title and joined parts
 *
 * @example
 * ```typescript
 * buildInstructionBlock(
 *   "Basic Info",
 *   ["Extract name", "Extract kind"],
 *   "Additional instruction"
 * )
 * // Returns: "__Basic Info__\nExtract name\nExtract kind\nAdditional instruction"
 * ```
 */
export function buildInstructionBlock(
  title: string,
  ...parts: (string | readonly string[])[]
): string {
  const flattenedParts = parts.flat();
  if (flattenedParts.length === 0) {
    return `__${title}__`;
  }
  return `__${title}__\n${flattenedParts.join("\n")}`;
}
