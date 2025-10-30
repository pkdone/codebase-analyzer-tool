import { aggregatesSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const aggregatesPrompt: AppSummaryPromptTemplate = {
  label: "Aggregates",
  summaryType: "domain aggregate analysis",
  contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.CONCISE_LIST} of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories`,
  responseSchema: aggregatesSchema,
  instructions: [
    {
      points: [
        "a concise list of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories",
      ],
    },
  ],
};
