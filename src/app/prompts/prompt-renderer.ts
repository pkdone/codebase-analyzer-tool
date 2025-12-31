import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import { FORCE_JSON_FORMAT } from "./templates";
import { type PromptDefinition, type DataBlockHeader } from "./prompt.types";

/**
 * Interface defining the variables required by BASE_PROMPT_TEMPLATE.
 * This provides compile-time checking that all required template variables are provided.
 */
interface BasePromptTemplateVariables {
  /** Description of the content being analyzed */
  readonly contentDesc: string;
  /** The joined instruction strings */
  readonly instructionsText: string;
  /** JSON format enforcement text */
  readonly forceJSON: string;
  /** JSON schema string for response validation */
  readonly jsonSchema: string;
  /** Header for the data block section */
  readonly dataBlockHeader: DataBlockHeader;
  /** Code block markers (empty string or "```\n") */
  readonly contentWrapper: string;
  /** Optional note for partial analysis */
  readonly partialAnalysisNote: string;
  /** The actual content to analyze */
  readonly content: unknown;
}

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
  const jsonSchemaString = JSON.stringify(zodToJsonSchema(definition.responseSchema), null, 2);
  const wrapInCodeBlock = definition.wrapInCodeBlock ?? false;
  const contentWrapper = wrapInCodeBlock ? "```\n" : "";

  // Join instructions - placeholders are now resolved at prompt definition creation time
  const instructionsText = definition.instructions.join("\n\n");

  // Handle partialAnalysisNote - convert to string or use empty string if undefined/null
  const partialAnalysisNote =
    typeof data.partialAnalysisNote === "string" ? data.partialAnalysisNote : "";

  // Build template data with all required variables for BASE_PROMPT_TEMPLATE.
  // Also spread original data for templates that use different variables (e.g., CODEBASE_QUERY_TEMPLATE uses 'question').
  const baseTemplateVars: BasePromptTemplateVariables = {
    content: data.content,
    contentDesc: definition.contentDesc,
    instructionsText,
    forceJSON: FORCE_JSON_FORMAT,
    jsonSchema: jsonSchemaString,
    dataBlockHeader: definition.dataBlockHeader,
    contentWrapper,
    partialAnalysisNote,
  };

  // Merge data (for other templates' variables) with base template variables
  const templateData = {
    ...data,
    ...baseTemplateVars,
  };

  return fillPrompt(definition.template, templateData);
}
