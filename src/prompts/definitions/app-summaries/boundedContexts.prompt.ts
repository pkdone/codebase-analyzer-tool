import { boundedContextsSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

export const boundedContextsPrompt: PromptDefinition = {
  label: "Bounded Contexts",
  contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models`,
  responseSchema: boundedContextsSchema,
  instructions: [
    {
      points: [
        "a concise list of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models",
      ],
    },
  ],
};
