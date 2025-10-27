import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";
import { PROMPT_FRAGMENTS } from "../../prompt-templates/prompt-fragments";

/**
 * Creates a prompt by filling template placeholders with the provided values.
 * This is a simple, declarative template-filling function that expects pre-formatted
 * instruction strings from the caller.
 *
 * @param template - The template string with placeholders (e.g., {{contentDesc}}, {{specificInstructions}})
 * @param contentDesc - Description of the content being analyzed
 * @param specificInstructions - Pre-formatted instruction string (should include "* " prefix for each instruction line)
 * @param schema - Zod schema for validation
 * @param codeContent - The actual content to analyze
 * @returns The filled prompt string
 */
export function createPrompt(
  template: string,
  contentDesc: string,
  specificInstructions: string,
  schema: z.ZodType,
  codeContent: string,
): string {
  return fillPrompt(template, {
    contentDesc,
    specificInstructions,
    forceJSON: PROMPT_FRAGMENTS.COMMON.FORCE_JSON_FORMAT,
    jsonSchema: JSON.stringify(zodToJsonSchema(schema), null, 2),
    codeContent,
  });
}

/**
 * Creates a prompt from configuration, formatting instructions array into bullet points.
 * This function wraps createPrompt with automatic formatting.
 */
export function createPromptFromConfig(
  template: string,
  contentDesc: string,
  instructions: readonly string[],
  schema: z.ZodType,
  codeContent: string,
): string {
  const specificInstructions = instructions.map((instruction) => `* ${instruction}`).join("\n");
  return createPrompt(template, contentDesc, specificInstructions, schema, codeContent);
}
