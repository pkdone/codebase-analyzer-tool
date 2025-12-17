import { z } from "zod";
import { CODEBASE_QUERY_TEMPLATE, BASE_PROMPT_TEMPLATE } from "../templates";
import { type PromptDefinition } from "../prompt.types";

/**
 * Prompt definition for codebase queries.
 * Used for RAG workflows where vector search results are provided as context
 * for answering developer questions about the codebase.
 */
export const codebaseQueryPromptDefinition: PromptDefinition = {
  label: "Codebase Query",
  introTextTemplate:
    "Act as a senior developer. I've provided the content of some source code files below in the section marked 'CODE'. Using all that code for context, answer the question a developer has asked about the code, where their question is shown in the section marked 'QUESTION' below. Provide your answer in a few paragraphs, referring to specific evidence in the provided code.",
  instructions: [], // Empty - CODEBASE_QUERY_TEMPLATE doesn't use {{instructionsText}}
  responseSchema: z.string(), // Text response, not JSON
  template: CODEBASE_QUERY_TEMPLATE,
  dataBlockHeader: "CODE" as const, // Not used by CODEBASE_QUERY_TEMPLATE but required by type
  wrapInCodeBlock: false,
};

/**
 * Factory function to create a reduce insights prompt definition for a specific category.
 * This is used in the REDUCE phase of the map-reduce strategy to consolidate partial insights.
 *
 * @param categoryLabel - The label for the category being reduced (e.g., "Entities", "Aggregates")
 * @param responseSchema - The Zod schema for the category's response structure
 * @returns A PromptDefinition configured for reducing insights of the given category
 */
export function createReduceInsightsPromptDefinition(
  categoryLabel: string,
  responseSchema: z.ZodType,
): PromptDefinition {
  return {
    label: `Reduce ${categoryLabel}`,
    introTextTemplate: `Act as a senior developer analyzing the code in a legacy application. You have been provided with several JSON objects shown below in the section marked '{{dataBlockHeader}}', each containing a list of '{{categoryKey}}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized.`,
    instructions: [`a consolidated list of '${categoryLabel}'`],
    responseSchema,
    template: BASE_PROMPT_TEMPLATE,
    dataBlockHeader: "FRAGMENTED_DATA" as const,
    wrapInCodeBlock: false,
  };
}
