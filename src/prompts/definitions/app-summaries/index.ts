import { appSummaryConfigMap, type AppSummaryConfigEntry } from "./app-summaries.config";
import { APP_SUMMARY_TEMPLATE } from "../../templates";
import { createPromptMetadata } from "../prompt-factory";

/**
 * Data-driven mapping of app summary categories to their templates and schemas.
 * Generated from centralized configuration using the generic prompt factory.
 */
export const appSummaryPromptMetadata = createPromptMetadata<
  keyof typeof appSummaryConfigMap,
  AppSummaryConfigEntry
>(appSummaryConfigMap, APP_SUMMARY_TEMPLATE, {
  contentDescBuilder: () => "a set of source file summaries", // Generic description
  instructionsBuilder: (config) => [{ points: [config.contentDesc] }], // Build instructions from the config's contentDesc
});
