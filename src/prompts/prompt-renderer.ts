import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import { FORCE_JSON_FORMAT } from "./templates";
import { type PromptDefinition } from "./prompt.types";

/**
 * Renders a prompt by filling template placeholders with the provided values.
 * This function handles all prompt formatting, including joining instruction strings,
 * rendering the introTextTemplate, and generating the JSON schema string from the response schema.
 *
 * @param definition - The prompt definition containing all configuration including template
 * @param data - All template variables needed to fill the template, including content
 * @returns The fully rendered prompt string
 */
export function renderPrompt(definition: PromptDefinition, data: Record<string, unknown>): string {
  const jsonSchemaString = JSON.stringify(zodToJsonSchema(definition.responseSchema), null, 2);
  const wrapInCodeBlock = definition.wrapInCodeBlock ?? false;
  const contentWrapper = wrapInCodeBlock ? "```\n" : "";

  // Join instructions for templates that need it
  const instructionsText = definition.instructions.join("\n\n");

  // Render the introTextTemplate with the provided data
  const introText = fillPrompt(definition.introTextTemplate, {
    ...data,
    instructionsText,
    dataBlockHeader: definition.dataBlockHeader,
  });

  const templateData = {
    ...data, // All template variables are passed in one object
    introText,
    forceJSON: FORCE_JSON_FORMAT,
    jsonSchema: jsonSchemaString,
    dataBlockHeader: definition.dataBlockHeader,
    contentWrapper,
    partialAnalysisNote: data.partialAnalysisNote ?? "",
  };
  return fillPrompt(definition.template, templateData);
}
