import { z } from "zod";
import { CODEBASE_QUERY_TEMPLATE, BASE_PROMPT_TEMPLATE } from "../templates";
import { type PromptDefinition } from "../prompt.types";
import { createPromptMetadata } from "./prompt-factory";

/**
 * Prompt definition for codebase queries.
 * Used for RAG workflows where vector search results are provided as context
 * for answering developer questions about the codebase.
 * Note: This uses a custom template that doesn't follow the BASE_PROMPT_TEMPLATE structure.
 */
export const codebaseQueryPromptDefinition: PromptDefinition = {
  label: "Codebase Query",
  contentDesc: "source code files", // Not actually used by CODEBASE_QUERY_TEMPLATE, but required by type
  instructions: [], // Empty - CODEBASE_QUERY_TEMPLATE doesn't use {{instructionsText}}
  responseSchema: z.string(), // Text response, not JSON
  template: CODEBASE_QUERY_TEMPLATE,
  dataBlockHeader: "CODE" as const, // Not used by CODEBASE_QUERY_TEMPLATE but required by type
  wrapInCodeBlock: false,
};

/**
 * Factory function to create a reduce insights prompt definition for a specific category.
 * This is used in the REDUCE phase of the map-reduce strategy to consolidate partial insights.
 * Now uses the generic factory for consistency with other prompt definitions.
 *
 * @param categoryLabel - The label for the category being reduced (e.g., "Entities", "Aggregates")
 * @param responseSchema - The Zod schema for the category's response structure
 * @returns A PromptDefinition configured for reducing insights of the given category
 */
export function createReduceInsightsPromptDefinition(
  categoryLabel: string,
  responseSchema: z.ZodType,
): PromptDefinition {
  const config = {
    label: `Reduce ${categoryLabel}`,
    instructions: [`a consolidated list of '${categoryLabel}'`] as const,
    responseSchema,
    contentDesc:
      "several JSON objects, each containing a list of '{{categoryKey}}' generated from different parts of a codebase",
  };

  // Create a single-entry map and extract the definition
  const metadata = createPromptMetadata({ reduce: config }, BASE_PROMPT_TEMPLATE, {
    contentDescBuilder: (cfg) => cfg.contentDesc,
    instructionsBuilder: (cfg) => cfg.instructions,
    dataBlockHeaderBuilder: () => "FRAGMENTED_DATA",
    wrapInCodeBlockBuilder: () => false,
  });

  // Return the single definition, but customize the contentDesc for this specific use case
  const definition = metadata.reduce;
  // Override contentDesc with a more detailed explanation for reduce operations
  definition.contentDesc =
    "several JSON objects, each containing a list of '{{categoryKey}}' generated from different parts of a codebase. Your task is to consolidate these lists into a single, de-duplicated, and coherent final JSON object. Merge similar items, remove duplicates based on semantic similarity (not just exact name matches), and ensure the final list is comprehensive and well-organized";
  return definition;
}
