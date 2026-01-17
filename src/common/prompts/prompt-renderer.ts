/**
 * Prompt rendering utilities for generating LLM prompts from definitions.
 */

import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import { type RenderablePrompt, LLMOutputFormat } from "./prompt.types";

/**
 * JSON format enforcement instruction used across all prompt templates.
 * This ensures LLM responses are valid, parseable JSON that conforms to strict formatting requirements.
 */
const FORCE_JSON_FORMAT = `The response MUST be valid JSON and meet the following critical JSON requirements:
- Only include JSON: start directly with { or [. No XML, markdown, explanations, or other text. Do NOT start with code fences or triple-backticks.
- Return data values according to the schema - do NOT return the schema definition itself
- All property names must be quoted: use "propertyName": value at ALL nesting levels (both opening and closing quotes required)
- Property name format: every property must follow the exact pattern "propertyName": value - no unquoted names (e.g., use "name": not name:)
- Property names must be followed by a colon: use "propertyName": value, not "propertyName" value or "propertyName" []
- All string values must be quoted: use "value" not unquoted strings
- No markdown formatting: do not use asterisks (*), bullet points (•), or any markdown characters before property names
- No stray text: do not include any text, characters, or lines between or around JSON properties
- Every property must have a name: do not omit property names (e.g., use "purpose": "value" not ": "value")
- Use proper JSON syntax: commas, colons, matching brackets/braces, and escape quotes in strings
- Complete and valid: ensure all property names are complete (no truncation) and JSON is parseable
- Use only exact property names from the schema - do not add extra properties or characters before property names
- No stray prefixes: do not add prefixes like "ar" or other characters before array elements or string values
- ASCII only: use only ASCII characters in string values
- No explanatory text: do not include phrases like "so many methods" or "I will stop here" in the JSON
- Proper commas: ensure commas separate all array elements and object properties
- Escape control characters: any control characters in string values must be properly escaped as \\uXXXX`;

/**
 * Builds the schema section for JSON-mode prompts.
 * This function generates the JSON schema block with format enforcement instructions.
 *
 * The schema section is only included in JSON-mode prompts. TEXT-mode prompts
 * return an empty string to avoid rendering an empty JSON code block.
 *
 * @param responseSchema - The Zod schema for the response
 * @returns The formatted schema section string including schema and FORCE_JSON_FORMAT instructions
 */
function buildSchemaSection(responseSchema: z.ZodType): string {
  const jsonSchemaString = JSON.stringify(zodToJsonSchema(responseSchema), null, 2);
  return `The JSON response must follow this JSON schema:
\`\`\`json
${jsonSchemaString}
\`\`\`

${FORCE_JSON_FORMAT}
`;
}

/**
 * Renders a prompt by filling template placeholders with the provided values.
 * This function handles all prompt formatting, including joining instruction strings
 * and generating the JSON schema string from the response schema.
 *
 * @param definition - The prompt definition containing all configuration including template
 * @param content - The actual content to analyze (code, summaries, etc.)
 * @param extras - Optional additional properties for custom templates (e.g., question for codebase queries)
 * @returns The fully rendered prompt string
 */
export function renderPrompt(
  definition: RenderablePrompt,
  content: unknown,
  extras?: Readonly<Record<string, unknown>>,
): string {
  const isJsonMode = definition.outputFormat !== LLMOutputFormat.TEXT;
  const schemaSection = isJsonMode ? buildSchemaSection(definition.responseSchema) : "";
  const contentWrapper = definition.wrapInCodeBlock ? "```\n" : "";
  const instructionsText = definition.instructions.join("\n\n");
  const templateData = {
    ...extras,
    content,
    contentDesc: definition.contentDesc,
    instructionsText,
    schemaSection,
    dataBlockHeader: definition.dataBlockHeader,
    contentWrapper,
  };
  return fillPrompt(definition.template, templateData);
}
