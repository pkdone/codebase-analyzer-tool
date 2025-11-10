import { AppSummaryCategoryType, PromptDefinition } from "../../prompt.types";
import { appSummaryConfigMap } from "./app-summaries.config";
import { APP_SUMMARY_TEMPLATE } from "../../templates";

/**
 * Data-driven mapping of app summary categories to their templates and schemas.
 * Generated from centralized configuration to eliminate redundant files.
 */
export const appSummaryPromptMetadata = Object.fromEntries(
  Object.entries(appSummaryConfigMap).map(([key, config]) => {
    const definition: PromptDefinition = {
      label: config.label,
      contentDesc: config.instructions[0].points[0], // Use first instruction point as contentDesc
      responseSchema: config.responseSchema,
      template: APP_SUMMARY_TEMPLATE,
      instructions: config.instructions,
    };
    return [key, definition];
  }),
) as Record<AppSummaryCategoryType, PromptDefinition>;
