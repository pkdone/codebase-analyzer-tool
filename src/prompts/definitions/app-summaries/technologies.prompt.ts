import { technologiesSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const technologiesPrompt: AppSummaryPromptTemplate = {
  label: "Technologies",
  summaryType: "technology inventory",
  contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of key external and host platform technologies depended on by the application`,
  responseSchema: technologiesSchema,
  instructions: [
    {
      points: [
        "a concise list of key external and host platform technologies depended on by the application",
      ],
    },
  ],
};
