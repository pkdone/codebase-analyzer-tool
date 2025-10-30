import { businessProcessesSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const businessProcessesPrompt: AppSummaryPromptTemplate = {
  label: "Business Processes",
  summaryType: "business process analysis",
  contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of the application's main business processes with their key business activity steps that are linearly conducted by each process`,
  responseSchema: businessProcessesSchema,
  instructions: [
    {
      points: [
        "a concise list of the application's main business processes with their key business activity steps that are linearly conducted by each process",
      ],
    },
  ],
};
