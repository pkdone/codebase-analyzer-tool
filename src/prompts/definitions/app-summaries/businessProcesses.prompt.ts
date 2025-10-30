import { businessProcessesSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

export const businessProcessesPrompt: PromptDefinition = {
  label: "Business Processes",
  contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of the application's main business processes with their key business activity steps that are linearly conducted by each process`,
  responseSchema: businessProcessesSchema,
  instructions: [
    {
      points: [
        "a concise list of the application's main business processes with their key business activity steps that are linearly conducted by each process",
      ],
    },
  ],
};
