import { fillPrompt } from "type-safe-prompt";
import { zodToJsonSchema } from "zod-to-json-schema";
import { FORCE_JSON_FORMAT } from "./definitions/instructions";
import { type PromptDefinition } from "./prompt.types";

/**
 * Builds the introduction text for the prompt based on the prompt type.
 * The intro text varies depending on the dataBlockHeader and whether it's a reduce operation.
 *
 * @param definition - The prompt definition
 * @param data - Template data that may contain categoryKey for reduce prompts
 * @returns The introduction text for the prompt
 */
function buildIntroText(definition: PromptDefinition, data: Record<string, unknown>): string {
  const { dataBlockHeader, contentDesc, instructions } = definition;
  const instructionsText = instructions.join("\n\n");

  // REDUCE_INSIGHTS style (FRAGMENTED_DATA header)
  if (dataBlockHeader === "FRAGMENTED_DATA") {
    const categoryKey = typeof data.categoryKey === "string" ? data.categoryKey : "items";
    return `Act as a senior developer analyzing the code in a legacy application. You have been provided with ${contentDesc} shown below in the section marked '${dataBlockHeader}', each containing a list of '${categoryKey}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized.`;
  }

  // SOURCES style (CODE header)
  if (dataBlockHeader === "CODE") {
    return `Act as a senior developer analyzing the code in a legacy application. Based on the ${contentDesc} shown below in the section marked '${dataBlockHeader}', return a JSON response that contains the following metadata about the source file:\n\n${instructionsText}.`;
  }

  // APP_SUMMARY style (FILE_SUMMARIES header) - default
  return `Act as a senior developer analyzing the code in a legacy application. Based on the ${contentDesc} shown below in the section marked '${dataBlockHeader}', return a JSON response that contains ${instructionsText}.`;
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

  const templateData = {
    ...data, // All template variables are passed in one object
    introText: buildIntroText(definition, data),
    forceJSON: FORCE_JSON_FORMAT,
    jsonSchema: jsonSchemaString,
    dataBlockHeader: definition.dataBlockHeader,
    contentWrapper,
    // Handle partialAnalysisNote - use type guard for safe type checking
    partialAnalysisNote:
      typeof data.partialAnalysisNote === "string" ? data.partialAnalysisNote : "",
  };
  return fillPrompt(definition.template, templateData);
}
