import { appSummaryConfigMap, type AppSummaryConfigEntry } from "./app-summaries.config";
import { BASE_PROMPT_TEMPLATE } from "../../templates";
import { createPromptMetadata } from "../prompt-factory";

/**
 * Data-driven mapping of app summary categories to their templates and schemas.
 * Generated from centralized configuration using the generic prompt factory.
 */
export const appSummaryPromptMetadata = createPromptMetadata<
  keyof typeof appSummaryConfigMap,
  AppSummaryConfigEntry
>(appSummaryConfigMap, BASE_PROMPT_TEMPLATE, {
  introTextTemplateBuilder: () =>
    "Act as a senior developer analyzing the code in a legacy application. Based on the a set of source file summaries shown below in the section marked '{{dataBlockHeader}}', return a JSON response that contains {{instructionsText}}.",
  instructionsBuilder: (config) => config.instructions, // Use instructions directly from config
  dataBlockHeaderBuilder: () => "FILE_SUMMARIES",
  wrapInCodeBlockBuilder: () => false,
});
