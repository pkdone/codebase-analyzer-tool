/**
 * Prompt templating utilities.
 *
 * Provides a convenience wrapper around the type-safe-prompt library's
 * fillPrompt function for rendering prompt templates with placeholder values.
 */

import { fillPrompt } from "type-safe-prompt";

/**
 * Fills a prompt template by replacing placeholders with the provided values.
 * This is a convenience alias for the type-safe-prompt library's fillPrompt function,
 * providing a more descriptive name within the prompt module context.
 *
 * @param template - The template string containing {{placeholder}} markers
 * @param values - An object mapping placeholder names to their replacement values
 * @returns The rendered template with all placeholders replaced
 *
 * @example
 * ```typescript
 * const result = fillTemplate("Hello {{name}}, welcome to {{place}}!", {
 *   name: "Alice",
 *   place: "Wonderland",
 * });
 * // => "Hello Alice, welcome to Wonderland!"
 * ```
 */
export const fillTemplate: typeof fillPrompt = fillPrompt;
