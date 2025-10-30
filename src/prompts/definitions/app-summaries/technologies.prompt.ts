import { technologiesSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

const INSTRUCTION = `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of key external and host platform technologies depended on by the application`;

export const technologiesPrompt: PromptDefinition = {
  label: "Technologies",
  contentDesc: INSTRUCTION,
  responseSchema: technologiesSchema,
  instructions: [
    {
      points: [INSTRUCTION],
    },
  ],
};
