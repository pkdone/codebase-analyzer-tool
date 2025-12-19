import { z } from "zod";
import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import { FORCE_JSON_FORMAT } from "./templates";
import { type PromptDefinition } from "./prompt.types";

/**
 * Options for rendering a prompt.
 */
export interface RenderPromptOptions {
  /**
   * Optional schema to override the definition's responseSchema.
   * Useful for dynamic prompts like reduce operations where the schema
   * varies based on the category being processed.
   */
  overrideSchema?: z.ZodType;
}

/**
 * Renders a prompt by filling template placeholders with the provided values.
 * This function handles all prompt formatting, including joining instruction strings
 * and generating the JSON schema string from the response schema.
 *
 * @param definition - The prompt definition containing all configuration including template
 * @param data - All template variables needed to fill the template, including content
 * @param options - Optional configuration for rendering (e.g., schema override)
 * @returns The fully rendered prompt string
 */
export function renderPrompt(
  definition: PromptDefinition,
  data: Record<string, unknown>,
  options?: RenderPromptOptions,
): string {
  // Use override schema if provided, otherwise use the definition's schema
  const schemaToUse = options?.overrideSchema ?? definition.responseSchema;
  const jsonSchemaString = JSON.stringify(zodToJsonSchema(schemaToUse), null, 2);
  const wrapInCodeBlock = definition.wrapInCodeBlock ?? false;
  const contentWrapper = wrapInCodeBlock ? "```\n" : "";

  // Join instructions and resolve any placeholders (e.g., {{categoryKey}} for reduce prompts)
  const joinedInstructions = definition.instructions.join("\n\n");
  const instructionsText = fillPrompt(joinedInstructions, data);

  // Resolve any placeholders in contentDesc as well (e.g., {{categoryKey}} for reduce prompts)
  const resolvedContentDesc = fillPrompt(definition.contentDesc, data);

  const templateData = {
    ...data, // All template variables are passed in one object
    contentDesc: resolvedContentDesc,
    instructionsText,
    forceJSON: FORCE_JSON_FORMAT,
    jsonSchema: jsonSchemaString,
    dataBlockHeader: definition.dataBlockHeader,
    contentWrapper,
    partialAnalysisNote: data.partialAnalysisNote ?? "",
  };
  return fillPrompt(definition.template, templateData);
}
