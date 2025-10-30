import { entitiesSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const entitiesPrompt: AppSummaryPromptTemplate = {
  label: "Entities",
  summaryType: "domain entity analysis",
  contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design entities that represent core business concepts and contain business logic`,
  responseSchema: entitiesSchema,
  instructions: [
    {
      points: [
        "a concise list of Domain-Driven Design entities that represent core business concepts and contain business logic",
      ],
    },
  ],
};
