import { scheduledJobsSummarySchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

export const scheduledJobsSummaryPrompt: PromptDefinition = {
  label: "Scheduled Jobs",
  contentDesc: `${APP_SUMMARY_FRAGMENTS.COMPREHENSIVE_LIST} of batch processes, scheduled jobs, and automated scripts that perform critical business operations`,
  responseSchema: scheduledJobsSummarySchema,
  instructions: [
    {
      points: [
        "a comprehensive list of batch processes, scheduled jobs, and automated scripts that perform critical business operations",
      ],
    },
  ],
};
