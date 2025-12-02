/**
 * Utility functions for building and formatting prompt instructions.
 */

/**
 * Options for creating a standard intro text template.
 */
export interface IntroTextOptions {
  /** Description of the content being analyzed (e.g., "JVM code", "source file summaries") */
  contentDescription: string;
  /**
   * What the JSON response should contain.
   * - If provided, appends this after "return a JSON response that contains"
   * - If omitted, uses the default "{{instructionsText}}"
   */
  responseDescription?: string;
  /**
   * Whether to include the article "the" before the content description.
   * - Defaults to true for most content types (e.g., "the JVM code")
   * - Set to false when contentDescription already includes an article (e.g., "a set of...")
   */
  includeArticle?: boolean;
}

/**
 * Creates a standardized intro text template for LLM prompts.
 * This ensures consistency across all prompt types while allowing customization.
 *
 * The generated template follows this pattern:
 * "Act as a senior developer analyzing the code in a legacy application.
 *  Based on [the] [contentDescription] shown below in the section marked '{{dataBlockHeader}}',
 *  return a JSON response that contains [responseDescription]."
 *
 * @param options - Configuration options for the intro text
 * @returns A formatted intro text template string with placeholders
 *
 * @example
 * ```typescript
 * // For source files (with detailed response description):
 * createIntroTextTemplate({
 *   contentDescription: "JVM code",
 *   responseDescription: "the following metadata about the source file:\n\n{{instructionsText}}."
 * })
 *
 * // For app summaries (own article, simpler response description):
 * createIntroTextTemplate({
 *   contentDescription: "a set of source file summaries",
 *   includeArticle: false,
 *   responseDescription: "{{instructionsText}}."
 * })
 * ```
 */
export function createIntroTextTemplate(options: IntroTextOptions): string {
  const {
    contentDescription,
    responseDescription = "{{instructionsText}}.",
    includeArticle = true,
  } = options;
  const article = includeArticle ? "the " : "";
  return `Act as a senior developer analyzing the code in a legacy application. Based on ${article}${contentDescription} shown below in the section marked '{{dataBlockHeader}}', return a JSON response that contains ${responseDescription}`;
}

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
