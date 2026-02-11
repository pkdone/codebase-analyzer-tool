/**
 * Prompt template constants used across the prompt system.
 *
 * This module contains the core template strings and instruction constants
 * for structured LLM prompts with JSON schema validation.
 */

/**
 * Template for structured analysis prompts with JSON schema validation.
 * This template uses placeholders for customization:
 * - {{personaIntroduction}}: Introduction text establishing the AI persona
 * - {{contextNote}}: Optional contextual note prepended before the schema (empty string if not needed)
 * - {{contentDesc}}: Description of the content being analyzed
 * - {{dataBlockHeader}}: The section header (e.g., "CODE", "FILE_SUMMARIES")
 * - {{instructionsText}}: The joined instruction strings from the prompt
 * - {{contentWrapper}}: Optional code block markers (```) if wrapInCodeBlock is true
 * - {{schemaSection}}: JSON schema section with format enforcement instructions
 *
 * Note: This template is used internally by the JSONSchemaPrompt class. It's exported for testing
 * and documentation purposes only.
 */
export const JSON_SCHEMA_PROMPT_TEMPLATE = `{{personaIntroduction}} Based on the {{contentDesc}} shown below in the section marked '{{dataBlockHeader}}', return a JSON response that contains:

{{instructionsText}}

{{contextNote}}{{schemaSection}}
{{dataBlockHeader}}:
{{contentWrapper}}{{content}}{{contentWrapper}}`;

/**
 * JSON format enforcement instruction used across all prompt templates.
 * This ensures LLM responses are valid, parseable JSON that conforms to strict formatting requirements.
 */
export const FORCE_JSON_FORMAT_INSTRUCTIONS = `The response MUST be valid JSON and meet the following critical JSON requirements:
- Only include JSON: start directly with { or [. No XML, markdown, explanations, or other text.
- Do NOT start or end the response with markdown code fences (triple-backticks).
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
