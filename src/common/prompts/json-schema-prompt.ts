/**
 * Pure function for rendering LLM prompts with JSON schema validation.
 *
 * This module provides the renderJsonSchemaPrompt function that renders
 * a prompt string from a configuration and content, for prompts that
 * require structured JSON responses.
 *
 * Template constants are defined in constants.ts and re-exported here for backwards compatibility.
 */

import { zodToJsonSchema } from "zod-to-json-schema";
import type { z } from "zod";
import { JSON_SCHEMA_PROMPT_TEMPLATE, FORCE_JSON_FORMAT_INSTRUCTIONS } from "./constants";
import { fillTemplate } from "./templating";

// Re-export constants for backwards compatibility

/**
 * Configuration for rendering a JSON schema prompt.
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
 * Builds the schema section for JSON-mode prompts.
 * Generates the JSON schema block with format enforcement instructions.
 */
function buildSchemaSection(responseSchema: z.ZodType<unknown>): string {
  const jsonSchemaString = JSON.stringify(zodToJsonSchema(responseSchema), null, 2);
  return `The JSON response must follow this JSON schema:
\`\`\`json
${jsonSchemaString}
\`\`\`

${FORCE_JSON_FORMAT_INSTRUCTIONS}
`;
}

/**
 * Renders a prompt by filling template placeholders with the provided configuration and content.
 * This is a pure function that handles all prompt formatting, including joining instruction strings
 * and generating the JSON schema string from the response schema.
 *
 * @param config - The complete prompt configuration
 * @param content - The actual content to analyze (code, summaries, etc.)
 * @returns The fully rendered prompt string
 *
 * @example
 * ```typescript
 * const rendered = renderJsonSchemaPrompt(myConfig, codeContent);
 * ```
 */
export function renderJsonSchemaPrompt(config: JSONSchemaPromptConfig, content: string): string {
  const schemaSection = buildSchemaSection(config.responseSchema);
  const contentWrapper = config.wrapInCodeBlock ? "```\n" : "";
  const instructionsText = config.instructions.join("\n\n");
  const templateData = {
    personaIntroduction: config.personaIntroduction,
    content,
    contentDesc: config.contentDesc,
    instructionsText,
    contextNote: config.contextNote ?? "",
    schemaSection,
    dataBlockHeader: config.dataBlockHeader,
    contentWrapper,
  };
  return fillTemplate(JSON_SCHEMA_PROMPT_TEMPLATE, templateData);
}

export { JSON_SCHEMA_PROMPT_TEMPLATE, FORCE_JSON_FORMAT_INSTRUCTIONS } from "./constants";
