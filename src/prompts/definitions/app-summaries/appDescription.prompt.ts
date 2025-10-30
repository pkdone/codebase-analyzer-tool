import { appDescriptionSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const appDescriptionPrompt: AppSummaryPromptTemplate = {
  label: "Application Description",
  summaryType: "application description",
  contentDescription: COMMON_INSTRUCTION_FRAGMENTS.DETAILED_DESCRIPTION,
  responseSchema: appDescriptionSchema,
  instructions: [{ points: [COMMON_INSTRUCTION_FRAGMENTS.DETAILED_DESCRIPTION] }],
};
