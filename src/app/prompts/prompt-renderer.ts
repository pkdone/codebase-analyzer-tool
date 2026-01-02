import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import { FORCE_JSON_FORMAT } from "./templates";
import { type PromptDefinition, type DataBlockHeader } from "./prompt.types";
import { LLMOutputFormat } from "../../common/llm/types/llm.types";

/**
 * Interface defining the variables required by BASE_PROMPT_TEMPLATE.
 * This provides compile-time checking that all required template variables are provided.
 */
interface BasePromptTemplateVariables {
  /** Description of the content being analyzed */
  readonly contentDesc: string;
  /** The joined instruction strings */
  readonly instructionsText: string;
  /** Conditional schema section (includes schema header, code block, and format enforcement for JSON mode; empty for TEXT mode) */
  readonly schemaSection: string;
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
 * Builds the schema section for JSON-mode prompts.
 * Returns an empty string for TEXT-mode prompts to avoid rendering an empty JSON code block.
 *
 * @param responseSchema - The Zod schema for the response
 * @returns The formatted schema section string
 */
function buildSchemaSection(responseSchema: PromptDefinition["responseSchema"]): string {
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
 * @param data - All template variables needed to fill the template, including content
 * @returns The fully rendered prompt string
 */
export function renderPrompt(definition: PromptDefinition, data: Record<string, unknown>): string {
  // Determine if this is a JSON-mode prompt (default) or TEXT-mode
  const isJsonMode = definition.outputFormat !== LLMOutputFormat.TEXT;

  // Build the schema section conditionally - empty for TEXT-mode to avoid rendering empty JSON code block
  const schemaSection = isJsonMode ? buildSchemaSection(definition.responseSchema) : "";

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
    schemaSection,
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
