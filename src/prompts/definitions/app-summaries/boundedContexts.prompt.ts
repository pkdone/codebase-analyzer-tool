import { boundedContextsSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

const INSTRUCTION = `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design Bounded Contexts that define explicit boundaries around related business capabilities and their models`;

export const boundedContextsPrompt: PromptDefinition = {
  label: "Bounded Contexts",
  contentDesc: INSTRUCTION,
  responseSchema: boundedContextsSchema,
  instructions: [
    {
      points: [INSTRUCTION],
    },
  ],
};
