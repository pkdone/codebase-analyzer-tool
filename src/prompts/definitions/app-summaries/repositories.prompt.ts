import { repositoriesSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

const INSTRUCTION = `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate`;

export const repositoriesPrompt: PromptDefinition = {
  label: "Repositories",
  contentDesc: INSTRUCTION,
  responseSchema: repositoriesSchema,
  instructions: [
    {
      points: [INSTRUCTION],
    },
  ],
};
