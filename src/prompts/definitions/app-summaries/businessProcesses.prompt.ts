import { businessProcessesSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

const INSTRUCTION = `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of the application's main business processes with their key business activity steps that are linearly conducted by each process`;

export const businessProcessesPrompt: PromptDefinition = {
  label: "Business Processes",
  contentDesc: INSTRUCTION,
  responseSchema: businessProcessesSchema,
  instructions: [
    {
      points: [INSTRUCTION],
    },
  ],
};
