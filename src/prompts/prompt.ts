import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import { PROMPT_FRAGMENTS } from "./definitions/fragments";
import { type PromptDefinition } from "./prompt.types";

/**
 * Formats instructions by joining them with newlines.
 * Instructions are expected to be pre-formatted strings that may include
 * section titles (e.g., "__TITLE__\n- Point 1").
 */
function formatInstructions(instructions: readonly string[]): string {
  return instructions.join("\n\n");
}

/**
 * Renders a prompt by filling template placeholders with the provided values.
 * This function handles all prompt formatting, including converting instruction sections to formatted text
 * and generating the JSON schema string from the response schema.
 *
 * @param definition - The prompt definition containing all configuration including template
 * @param data - All template variables needed to fill the template, including content
 * @returns The fully rendered prompt string
 */
export function renderPrompt(definition: PromptDefinition, data: Record<string, unknown>): string {
  const instructionsText = formatInstructions(definition.instructions);
  const jsonSchemaString = JSON.stringify(zodToJsonSchema(definition.responseSchema), null, 2);

  const templateData = {
    ...data, // All template variables are passed in one object
    instructions: instructionsText,
    forceJSON: PROMPT_FRAGMENTS.COMMON.FORCE_JSON_FORMAT,
    jsonSchema: jsonSchemaString,
    contentDesc: definition.contentDesc,
    // Handle partialAnalysisNote - use nullish coalescing to only default when null/undefined
    partialAnalysisNote: (data.partialAnalysisNote as string | undefined) ?? "",
  };

  return fillPrompt(definition.template, templateData);
}
