import { boundedContextsSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const boundedContextsPrompt: AppSummaryPromptTemplate = {
  label: "Bounded Contexts",
  summaryType: "bounded context analysis",
  contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models`,
  responseSchema: boundedContextsSchema,
  instructions: [
    {
      points: [
        "a concise list of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models",
      ],
    },
  ],
};
