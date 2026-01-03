import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";

/**
 * Centralized prompt templates for the application.
 * Consolidates all prompt templates in one location for better organization.
 */

/**
 * JSON format enforcement instruction used across all prompt templates.
 * This ensures LLM responses are valid, parseable JSON that conforms to strict formatting requirements.
 */
export const FORCE_JSON_FORMAT = `The response MUST be valid JSON and meet the following critical JSON requirements:
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
 * Unified base template for all prompt types (sources, app summaries, reduce insights).
 * This consolidates the common structure and eliminates duplication across templates.
 * The template uses placeholders for customization:
 * - {{contentDesc}}: Description of the content being analyzed (e.g., "JVM code", "a set of source file summaries")
 * - {{dataBlockHeader}}: The section header (e.g., "CODE", "FILE_SUMMARIES", "FRAGMENTED_DATA")
 * - {{instructionsText}}: The joined instruction strings from the PromptDefinition
 * - {{contentWrapper}}: Optional code block markers (```) if wrapInCodeBlock is true
 * - {{schemaSection}}: Conditional JSON schema section (empty for TEXT-mode prompts)
 */
export const BASE_PROMPT_TEMPLATE = `Act as a senior developer analyzing the code in a legacy application. Based on the {{contentDesc}} shown below in the section marked '{{dataBlockHeader}}', return a JSON response that contains {{instructionsText}}.

{{partialAnalysisNote}}{{schemaSection}}
{{dataBlockHeader}}:
{{contentWrapper}}{{content}}{{contentWrapper}}`;

/**
 * Template for querying the codebase with a specific question.
 * Used for RAG (Retrieval-Augmented Generation) workflows where vector search results
 * are provided as context for answering developer questions about the codebase.
 */
export const CODEBASE_QUERY_TEMPLATE = `Act as a senior developer. I've provided the content of some source code files below in the section marked 'CODE'. Using all that code for context, answer the question a developer has asked about the code, where their question is shown in the section marked 'QUESTION' below. Provide your answer in a few paragraphs, referring to specific evidence in the provided code.

QUESTION:
{{question}}

CODE:
{{content}}`;

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
export function buildSchemaSection(responseSchema: z.ZodType): string {
  const jsonSchemaString = JSON.stringify(zodToJsonSchema(responseSchema), null, 2);
  return `The JSON response must follow this JSON schema:
\`\`\`json
${jsonSchemaString}
\`\`\`

${FORCE_JSON_FORMAT}
`;
}
