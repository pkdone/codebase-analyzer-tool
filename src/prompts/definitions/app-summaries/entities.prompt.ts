import { entitiesSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

const INSTRUCTION = `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain-Driven Design entities that represent core business concepts and contain business logic`;

export const entitiesPrompt: PromptDefinition = {
  label: "Entities",
  contentDesc: INSTRUCTION,
  responseSchema: entitiesSchema,
  instructions: [
    {
      points: [INSTRUCTION],
    },
  ],
};
