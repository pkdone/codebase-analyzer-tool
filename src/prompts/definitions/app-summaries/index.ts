import { AppSummaryCategoryType } from "../../types/app-summaries.types";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { appSummaryConfigMap } from "./app-summaries.config";

/**
 * Data-driven mapping of app summary categories to their templates and schemas.
 * Generated from centralized configuration to eliminate redundant files.
 */
export const appSummaryPromptMetadata = Object.fromEntries(
  Object.entries(appSummaryConfigMap).map(([key, config]) => {
    const definition: PromptDefinition = {
      label: config.label,
      contentDesc: config.instruction,
      responseSchema: config.responseSchema,
      template: config.template,
      instructions: [
        {
          points: [config.instruction],
        },
      ],
    };
    return [key, definition];
  }),
) as Record<AppSummaryCategoryType, PromptDefinition>;
