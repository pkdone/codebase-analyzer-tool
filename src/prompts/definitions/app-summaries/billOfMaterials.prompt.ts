import { billOfMaterialsSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

const INSTRUCTION = `${APP_SUMMARY_FRAGMENTS.COMPREHENSIVE_LIST} of all third-party dependencies with version conflict detection to identify technical debt and security risks`;

export const billOfMaterialsPrompt: PromptDefinition = {
  label: "Bill of Materials",
  contentDesc: `${APP_SUMMARY_FRAGMENTS.COMPREHENSIVE_LIST} of all third-party dependencies with version conflict detection ${APP_SUMMARY_FRAGMENTS.SECURITY_RISKS}`,
  responseSchema: billOfMaterialsSchema,
  instructions: [
    {
      points: [INSTRUCTION],
    },
  ],
};
