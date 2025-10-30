import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_FRAGMENTS } from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";

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
      title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [SOURCES_FRAGMENTS.COMMON.PURPOSE, SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.REFERENCES,
      points: [
        SOURCES_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS,
        SOURCES_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.USER_INPUT_FIELDS,
      points: [SOURCES_FRAGMENTS.JSP_SPECIFIC.DATA_INPUT_FIELDS],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.JSP_METRICS_ANALYSIS,
      points: [SOURCES_FRAGMENTS.JSP_SPECIFIC.JSP_METRICS_ANALYSIS],
    },
  ],
};
