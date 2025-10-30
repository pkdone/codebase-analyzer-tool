import { codeQualitySummarySchema } from "../../../schemas/app-summaries.schema";
import { PromptDefinition } from "../../types/prompt-definition.types";
import { APP_SUMMARY_FRAGMENTS } from "../fragments";

export const codeQualitySummaryPrompt: PromptDefinition = {
  label: "Code Quality Summary",
  contentDesc: APP_SUMMARY_FRAGMENTS.AGGREGATED_METRICS,
  responseSchema: codeQualitySummarySchema,
  instructions: [{ points: [APP_SUMMARY_FRAGMENTS.AGGREGATED_METRICS] }],
};
