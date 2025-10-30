import { repositoriesSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

export const repositoriesPrompt: PromptDefinition = {
  label: "Repositories",
  contentDesc: `${APP_SUMMARY_FRAGMENTS.CONCISE_LIST} of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate`,
  responseSchema: repositoriesSchema,
  instructions: [
    {
      points: [
        "a concise list of Domain Driven Design repositories that provide access to aggregate persistence, each associated with a specific aggregate",
      ],
    },
  ],
};
