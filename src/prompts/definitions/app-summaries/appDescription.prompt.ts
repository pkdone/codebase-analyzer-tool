import { appDescriptionSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

export const appDescriptionPrompt: PromptDefinition = {
  label: "Application Description",
  contentDesc: APP_SUMMARY_FRAGMENTS.DETAILED_DESCRIPTION,
  responseSchema: appDescriptionSchema,
  instructions: [{ points: [APP_SUMMARY_FRAGMENTS.DETAILED_DESCRIPTION] }],
};
