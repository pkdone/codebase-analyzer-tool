import { codeQualitySummarySchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const codeQualitySummaryPrompt: AppSummaryPromptTemplate = {
  label: "Code Quality Summary",
  summaryType: "code quality analysis",
  contentDescription: COMMON_INSTRUCTION_FRAGMENTS.AGGREGATED_METRICS,
  responseSchema: codeQualitySummarySchema,
  instructions: [{ points: [COMMON_INSTRUCTION_FRAGMENTS.AGGREGATED_METRICS] }],
};
