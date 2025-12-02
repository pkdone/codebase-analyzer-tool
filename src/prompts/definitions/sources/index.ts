import { sourceConfigMap, type SourceConfigEntry } from "./sources.config";
import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { BASE_PROMPT_TEMPLATE } from "../../templates";
import { createPromptMetadata } from "../prompt-factory";

/**
 * Data-driven mapping of prompt types to their templates and schemas.
 * Generated from centralized configuration using the generic prompt factory.
 */
export const fileTypePromptMetadata = createPromptMetadata(
  sourceConfigMap as Record<keyof typeof sourceConfigMap, SourceConfigEntry & { label?: string }>,
  BASE_PROMPT_TEMPLATE,
  {
    schemaBuilder: (config) => {
      // Dynamically pick fields from the master schema
      const schemaFields = config.schemaFields.reduce<Record<string, true>>((acc, field) => {
        acc[field] = true;
        return acc;
      }, {});
      return sourceSummarySchema.pick(
        schemaFields as Parameters<typeof sourceSummarySchema.pick>[0],
      );
    },
    introTextTemplateBuilder: (config) =>
      `Act as a senior developer analyzing the code in a legacy application. Based on the ${config.contentDesc} shown below in the section marked '{{dataBlockHeader}}', return a JSON response that contains the following metadata about the source file:\n\n{{instructionsText}}.`,
    instructionsBuilder: (config) => config.instructions,
    dataBlockHeaderBuilder: () => "CODE",
    wrapInCodeBlockBuilder: () => true,
  },
);

// Set hasComplexSchema for all source file types (defaults to true when undefined)
Object.values(fileTypePromptMetadata).forEach((metadata) => {
  metadata.hasComplexSchema ??= true;
});
