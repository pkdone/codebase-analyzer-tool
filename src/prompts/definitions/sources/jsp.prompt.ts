import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_PROMPT_FRAGMENTS } from "./common-fragments";
import { SOURCES_INSTRUCTION_SECTION_TITLES } from "./instruction-titles";

export const jspPrompt: SourcePromptTemplate = {
  contentDesc: "JSP code",
  hasComplexSchema: true,
  responseSchema: sourceSummarySchema.pick({
    purpose: true,
    implementation: true,
    internalReferences: true,
    externalReferences: true,
    dataInputFields: true,
    jspMetrics: true,
  }),
  instructions: [
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.REFERENCES,
      points: [
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.USER_INPUT_FIELDS,
      points: [SOURCES_PROMPT_FRAGMENTS.JSP_SPECIFIC.DATA_INPUT_FIELDS],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.JSP_METRICS_ANALYSIS,
      points: [SOURCES_PROMPT_FRAGMENTS.JSP_SPECIFIC.JSP_METRICS_ANALYSIS],
    },
  ],
};
