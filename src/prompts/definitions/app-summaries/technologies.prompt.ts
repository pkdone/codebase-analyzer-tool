import { technologiesSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

export const technologiesPrompt: PromptDefinition = {
  label: "Technologies",
  contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of key external and host platform technologies depended on by the application`,
  responseSchema: technologiesSchema,
  instructions: [
    {
      points: [
        "a concise list of key external and host platform technologies depended on by the application",
      ],
    },
  ],
};
