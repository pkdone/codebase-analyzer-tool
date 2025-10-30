import { moduleCouplingSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

export const moduleCouplingPrompt: PromptDefinition = {
  label: "Module Coupling",
  contentDesc: APP_SUMMARY_FRAGMENTS.DEPENDENCY_MATRIX,
  responseSchema: moduleCouplingSchema,
  instructions: [{ points: [APP_SUMMARY_FRAGMENTS.DEPENDENCY_MATRIX] }],
};
