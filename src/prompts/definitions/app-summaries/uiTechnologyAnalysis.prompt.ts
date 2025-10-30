import { uiTechnologyAnalysisSchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

export const uiTechnologyAnalysisPrompt: PromptDefinition = {
  label: "UI Technology Analysis",
  contentDesc: `${APP_SUMMARY_FRAGMENTS.COMPREHENSIVE_ANALYSIS} of UI layer technologies including legacy web frameworks, JSP scriptlet usage, and custom tag libraries ${APP_SUMMARY_FRAGMENTS.TECHNICAL_DEBT_ASSESSMENT}`,
  responseSchema: uiTechnologyAnalysisSchema,
  instructions: [
    {
      points: [
        "a comprehensive analysis of UI layer technologies including legacy web frameworks, JSP scriptlet usage, and custom tag libraries to assess technical debt and plan modernization efforts",
      ],
    },
  ],
};
