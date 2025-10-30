import { scheduledJobsSummarySchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

const INSTRUCTION = `${APP_SUMMARY_FRAGMENTS.COMPREHENSIVE_LIST} of batch processes, scheduled jobs, and automated scripts that perform critical business operations`;

export const scheduledJobsSummaryPrompt: PromptDefinition = {
  label: "Scheduled Jobs",
  contentDesc: INSTRUCTION,
  responseSchema: scheduledJobsSummarySchema,
  instructions: [
    {
      points: [INSTRUCTION],
    },
  ],
};
