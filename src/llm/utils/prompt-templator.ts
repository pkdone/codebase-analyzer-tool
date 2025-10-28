import { zodToJsonSchema } from "zod-to-json-schema";
import { fillPrompt } from "type-safe-prompt";
import { z } from "zod";
import { PROMPT_FRAGMENTS } from "../../prompt-templates/prompt-fragments";

/**
 * Creates a prompt by filling template placeholders with the provided values.
 * This is the unified function that handles all prompt formatting, including
 * converting instruction arrays to bullet points.
 *
 * @param template - The template string with placeholders (e.g., {{contentDesc}}, {{specificInstructions}})
 * @param contentDesc - Description of the content being analyzed
 * @param instructions - Array of instruction strings to be formatted as bullet points
 * @param schema - Zod schema for validation
 * @param codeContent - The actual content to analyze
 * @returns The filled prompt string
 */
export function buildPrompt(
  template: string,
  contentDesc: string,
  instructions: readonly string[],
  schema: z.ZodType,
  codeContent: string,
): string {
  const specificInstructions = instructions.map((instruction) => `* ${instruction}`).join("\n");
  return fillPrompt(template, {
    contentDesc,
    specificInstructions,
    forceJSON: PROMPT_FRAGMENTS.COMMON.FORCE_JSON_FORMAT,
    jsonSchema: JSON.stringify(zodToJsonSchema(schema), null, 2),
    codeContent,
  });
}
