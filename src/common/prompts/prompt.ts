/**
 * Prompt class for creating and rendering LLM prompts.
 *
 * This module provides the core Prompt class that encapsulates prompt configuration
 * and rendering logic. It replaces the previous separate types, factory, and renderer modules.
 */

import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";

/**
 * Configuration for creating a Prompt instance.
 * This interface defines the common structure for all prompt configurations
 * to ensure consistency and enable generic processing.
 *
 * All essential fields for prompt generation are required, eliminating the need
 * for defensive checks at runtime and improving type safety for downstream consumers.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType.
 */
export interface PromptConfig<S extends z.ZodType = z.ZodType> {
  /** Description of the content being analyzed (required) */
  contentDesc: string;
  /** Array of instruction strings for the LLM (required) */
  instructions: readonly string[];
  /**
   * Zod schema for validating the LLM response.
   * When provided, the prompt is rendered in JSON mode with the schema section included.
   * When omitted, the prompt is rendered in TEXT mode without schema instructions.
   */
  responseSchema?: S;
  /** Whether the schema is complex and incompatible with some LLM providers */
  hasComplexSchema?: boolean;
  /**
   * The data block header to use in the template (required).
   * Factories must explicitly define their presentation.
   * Applications can constrain this to specific values using branded types or unions.
   */
  dataBlockHeader: string;
  /**
   * Whether to wrap content in code blocks (required).
   * Factories must explicitly define their presentation.
   */
  wrapInCodeBlock: boolean;
}

/**
 * Configuration for JSON-mode prompts that require a response schema.
 * Use this type for prompts that expect structured JSON responses from the LLM.
 *
 * @template S - The Zod schema type for validating the LLM response.
 */
export type JsonPromptConfig<S extends z.ZodType = z.ZodType> = Omit<
  PromptConfig<S>,
  "responseSchema"
> & {
  /** Zod schema for validating the LLM response (required for JSON mode) */
  responseSchema: S;
};

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
 * A complete prompt ready for rendering.
 * This class encapsulates prompt configuration and provides a method to render
 * the final prompt string with the provided content.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType.
 *
 * @example
 * ```typescript
 * const prompt = new Prompt(myConfig, MY_TEMPLATE);
 * const rendered = prompt.renderPrompt(codeContent);
 * ```
 */
export class Prompt<S extends z.ZodType = z.ZodType> {
  /** Description of the content being analyzed (e.g., "JVM code", "a set of source file summaries") */
  readonly contentDesc: string;
  /** Array of instruction strings for the LLM. Instructions can include section titles
   * formatted as "__TITLE__\n- Point 1" for better organization. */
  readonly instructions: readonly string[];
  /**
   * Zod schema for validating the LLM response.
   * When defined, the prompt is rendered in JSON mode with schema instructions.
   * When undefined, the prompt is rendered in TEXT mode without schema.
   */
  readonly responseSchema?: S;
  /** Template string for rendering the prompt */
  readonly template: string;
  /** Header text for the data block section (e.g., "CODE", "FILE_SUMMARIES") */
  readonly dataBlockHeader: string;
  /** Whether to wrap the content in code block markers (```) */
  readonly wrapInCodeBlock: boolean;

  /**
   * Creates a new Prompt instance from configuration and template.
   *
   * @param config - The prompt configuration containing all metadata
   * @param template - The template string to use for rendering
   */
  constructor(config: PromptConfig<S>, template: string) {
    this.contentDesc = config.contentDesc;
    this.instructions = config.instructions;
    this.responseSchema = config.responseSchema;
    this.dataBlockHeader = config.dataBlockHeader;
    this.wrapInCodeBlock = config.wrapInCodeBlock;
    this.template = template;
  }

  /**
   * Renders the prompt by filling template placeholders with the provided values.
   * This method handles all prompt formatting, including joining instruction strings
   * and generating the JSON schema string from the response schema.
   *
   * @param content - The actual content to analyze (code, summaries, etc.)
   * @param extras - Optional additional properties for custom templates (e.g., question for codebase queries)
   * @returns The fully rendered prompt string
   */
  renderPrompt(content: string, extras?: Readonly<Record<string, unknown>>): string {
    const schemaSection = this.responseSchema ? buildSchemaSection(this.responseSchema) : "";
    const contentWrapper = this.wrapInCodeBlock ? "```\n" : "";
    const instructionsText = this.instructions.join("\n\n");
    const templateData = {
      ...extras,
      content,
      contentDesc: this.contentDesc,
      instructionsText,
      schemaSection,
      dataBlockHeader: this.dataBlockHeader,
      contentWrapper,
    };
    return fillPrompt(this.template, templateData);
  }
}
