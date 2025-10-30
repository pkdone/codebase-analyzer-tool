import { uiTechnologyAnalysisSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const uiTechnologyAnalysisPrompt: AppSummaryPromptTemplate = {
  label: "UI Technology Analysis",
  summaryType: "UI technology analysis",
  contentDescription: `${COMMON_INSTRUCTION_FRAGMENTS.COMPREHENSIVE_ANALYSIS} of UI layer technologies including legacy web frameworks, JSP scriptlet usage, and custom tag libraries ${COMMON_INSTRUCTION_FRAGMENTS.TECHNICAL_DEBT_ASSESSMENT}`,
  responseSchema: uiTechnologyAnalysisSchema,
  instructions: [
    {
      points: [
        "a comprehensive analysis of UI layer technologies including legacy web frameworks, JSP scriptlet usage, and custom tag libraries to assess technical debt and plan modernization efforts",
      ],
    },
  ],
};
