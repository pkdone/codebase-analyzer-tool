import { scheduledJobsSummarySchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const scheduledJobsSummaryPrompt: AppSummaryPromptTemplate = {
  label: "Scheduled Jobs",
  summaryType: "scheduled job analysis",
  contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.COMPREHENSIVE_LIST} of batch processes, scheduled jobs, and automated scripts that perform critical business operations`,
  responseSchema: scheduledJobsSummarySchema,
  instructions: [
    {
      points: [
        "a comprehensive list of batch processes, scheduled jobs, and automated scripts that perform critical business operations",
      ],
    },
  ],
};
