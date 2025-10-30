import { billOfMaterialsSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const billOfMaterialsPrompt: AppSummaryPromptTemplate = {
  label: "Bill of Materials",
  summaryType: "dependency inventory",
  contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.COMPREHENSIVE_LIST} of all third-party dependencies with version conflict detection ${COMMON_INSTRUCTION_FRAGMENTS.SECURITY_RISKS}`,
  responseSchema: billOfMaterialsSchema,
  instructions: [
    {
      points: [
        "a comprehensive list of all third-party dependencies with version conflict detection to identify technical debt and security risks",
      ],
    },
  ],
};
