import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import { PROMPT_FRAGMENTS } from "./definitions/fragments";
import { type InstructionSection, type PromptDefinition } from "./prompt.types";

/**
 * Formats instruction sections with optional titles, joining points with newlines.
 * Sections with titles have the title formatted with underscores, then points are listed.
 * Sections without titles list points directly.
 */
function formatInstructions(instructions: readonly InstructionSection[]): string {
  return instructions
    .map((section) => {
      const title = section.title ? `__${section.title}__\n` : "";
      const points = section.points.join("\n");
      return `${title}${points}`;
    })
    .join("\n\n");
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
