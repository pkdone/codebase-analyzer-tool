import { moduleCouplingSchema } from "../../../schemas/app-summaries.schema";
import { AppSummaryPromptTemplate } from "../../types/app-summaries.types";
import { COMMON_INSTRUCTION_FRAGMENTS } from "./common-fragments";

export const moduleCouplingPrompt: AppSummaryPromptTemplate = {
  label: "Module Coupling",
  summaryType: "module coupling analysis",
  contentDescription: COMMON_INSTRUCTION_FRAGMENTS.DEPENDENCY_MATRIX,
  responseSchema: moduleCouplingSchema,
  instructions: [{ points: [COMMON_INSTRUCTION_FRAGMENTS.DEPENDENCY_MATRIX] }],
};
