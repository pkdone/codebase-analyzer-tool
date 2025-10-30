import { repositoriesSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const repositoriesPrompt: AppSummaryPromptTemplate = {
  label: "Repositories",
  summaryType: "repository pattern analysis",
  contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate`,
  responseSchema: repositoriesSchema,
  instructions: [
    {
      points: [
        "a concise list of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate",
      ],
    },
  ],
};
