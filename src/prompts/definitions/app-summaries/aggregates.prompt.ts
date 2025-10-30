import { aggregatesSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

export const aggregatesPrompt: PromptDefinition = {
  label: "Aggregates",
  contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories`,
  responseSchema: aggregatesSchema,
  instructions: [
    {
      points: [
        "a concise list of Domain Driven Design aggregates that enforce business rules and maintain consistency, including their associated domain entities and repositories",
      ],
    },
  ],
};
