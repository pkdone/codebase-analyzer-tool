import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_FRAGMENTS } from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";

export const xmlPrompt: SourcePromptTemplate = {
  contentDesc: "XML code",
  hasComplexSchema: true,
  responseSchema: sourceSummarySchema.pick({
    purpose: true,
    implementation: true,
    uiFramework: true,
  }),
  instructions: [
    {
      title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [SOURCES_FRAGMENTS.COMMON.PURPOSE, SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.UI_FRAMEWORK_DETECTION,
      points: [SOURCES_FRAGMENTS.XML_SPECIFIC.UI_FRAMEWORK_DETECTION],
    },
  ],
};
