/**
 * JSONSchemaPrompt class for creating and rendering LLM prompts with JSON schema validation.
 *
 * This module provides the core JSONSchemaPrompt class that encapsulates prompt configuration
 * and rendering logic for prompts that require structured JSON responses.
 */

import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";

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

/**
 * Configuration for creating a JSONSchemaPrompt instance.
 * This interface defines the structure for all prompt configurations,
 * ensuring consistency and enabling generic processing.
 *
 * All essential fields for prompt generation are required, eliminating the need
 * for defensive checks at runtime and improving type safety for downstream consumers.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType<unknown>
 *               for type-safe handling when the generic is not explicitly specified.
 */
export interface JSONSchemaPromptConfig<S extends z.ZodType<unknown> = z.ZodType<unknown>> {
  /** Introduction text establishing the AI persona */
  personaIntroduction: string;
  /** Description of the content being analyzed */
  contentDesc: string;
  /** Array of instruction strings for the LLM */
  instructions: readonly string[];
  /** Zod schema for validating the LLM response */
  responseSchema: S;
  /** Whether the schema is complex and incompatible with some LLM providers */
  hasComplexSchema?: boolean;
  /** The data block header to use in the template (e.g., "CODE", "FILE_SUMMARIES") */
  dataBlockHeader: string;
  /** Whether to wrap content in code blocks */
  wrapInCodeBlock: boolean;
  /**
   * Optional contextual note to prepend before the schema section.
   * This is a generic mechanism for adding context-specific information to prompts,
   * such as partial analysis notes in map-reduce workflows.
   * The string should include any trailing newlines needed for formatting.
   */
  contextNote?: string;
}

/**
 * A complete prompt ready for rendering with JSON schema validation.
 * This class encapsulates prompt configuration and provides a method to render
 * the final prompt string with the provided content.
 *
 * All prompts use the standard JSON_SCHEMA_PROMPT_TEMPLATE internally and require
 * a response schema for JSON mode validation.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType<unknown>
 *               for type-safe handling when the generic is not explicitly specified.
 *
 * @example
 * ```typescript
 * const prompt = new JSONSchemaPrompt(myConfig);
 * const rendered = prompt.renderPrompt(codeContent);
 * ```
 */
export class JSONSchemaPrompt<S extends z.ZodType<unknown> = z.ZodType<unknown>> {
  /** Introduction text establishing the AI persona */
  readonly personaIntroduction: string;
  /** Description of the content being analyzed (e.g., "JVM code", "a set of source file summaries") */
  readonly contentDesc: string;
  /** Array of instruction strings for the LLM. Instructions can include section titles
   * formatted as "__TITLE__\n- Point 1" for better organization. */
  readonly instructions: readonly string[];
  /** Zod schema for validating the LLM response (required for JSON mode) */
  readonly responseSchema: S;
  /** Header text for the data block section (e.g., "CODE", "FILE_SUMMARIES") */
  readonly dataBlockHeader: string;
  /** Whether to wrap the content in code block markers (```) */
  readonly wrapInCodeBlock: boolean;
  /** Optional contextual note prepended before the schema section */
  readonly contextNote: string;

  /**
   * Creates a new JSONSchemaPrompt instance from configuration.
   *
   * @param config - The prompt configuration containing all metadata including responseSchema
   */
  constructor(config: JSONSchemaPromptConfig<S>) {
    this.personaIntroduction = config.personaIntroduction;
    this.contentDesc = config.contentDesc;
    this.instructions = config.instructions;
    this.responseSchema = config.responseSchema;
    this.dataBlockHeader = config.dataBlockHeader;
    this.wrapInCodeBlock = config.wrapInCodeBlock;
    this.contextNote = config.contextNote ?? "";
  }

  /**
   * Renders the prompt by filling template placeholders with the provided values.
   * This method handles all prompt formatting, including joining instruction strings
   * and generating the JSON schema string from the response schema.
   *
   * @param content - The actual content to analyze (code, summaries, etc.)
   * @returns The fully rendered prompt string
   */
  renderPrompt(content: string): string {
    const schemaSection = this.buildSchemaSection();
    const contentWrapper = this.wrapInCodeBlock ? "```\n" : "";
    const instructionsText = this.instructions.join("\n\n");
    const templateData = {
      personaIntroduction: this.personaIntroduction,
      content,
      contentDesc: this.contentDesc,
      instructionsText,
      contextNote: this.contextNote,
      schemaSection,
      dataBlockHeader: this.dataBlockHeader,
      contentWrapper,
    };
    return fillPrompt(JSON_SCHEMA_PROMPT_TEMPLATE, templateData);
  }

  /**
   * Builds the schema section for JSON-mode prompts.
   * This method generates the JSON schema block with format enforcement instructions.
   *
   * @returns The formatted schema section string including schema and FORCE_JSON_FORMAT instructions
   */
  private buildSchemaSection(): string {
    const jsonSchemaString = JSON.stringify(zodToJsonSchema(this.responseSchema), null, 2);
    return `The JSON response must follow this JSON schema:
\`\`\`json
${jsonSchemaString}
\`\`\`

${FORCE_JSON_FORMAT_INSTRUCTIONS}
`;
  }
}
