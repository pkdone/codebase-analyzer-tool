import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import { FORCE_JSON_FORMAT } from "./definitions/fragments";
import { type PromptDefinition } from "./prompt.types";

/**
 * Renders a prompt by filling template placeholders with the provided values.
 * This function handles all prompt formatting, including joining instruction strings
 * and generating the JSON schema string from the response schema.
 *
 * @param definition - The prompt definition containing all configuration including template
 * @param data - All template variables needed to fill the template, including content
 * @returns The fully rendered prompt string
 */
export function renderPrompt(definition: PromptDefinition, data: Record<string, unknown>): string {
  const instructionsText = definition.instructions.join("\n\n");
  const jsonSchemaString = JSON.stringify(zodToJsonSchema(definition.responseSchema), null, 2);
  const templateData = {
    ...data, // All template variables are passed in one object
    instructions: instructionsText,
    forceJSON: FORCE_JSON_FORMAT,
    jsonSchema: jsonSchemaString,
    contentDesc: definition.contentDesc,
    // Handle partialAnalysisNote - use type guard for safe type checking
    partialAnalysisNote:
      typeof data.partialAnalysisNote === "string" ? data.partialAnalysisNote : "",
  };
  return fillPrompt(definition.template, templateData);
}
