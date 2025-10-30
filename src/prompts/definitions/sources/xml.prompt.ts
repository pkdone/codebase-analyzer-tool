import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_PROMPT_FRAGMENTS } from "./common-fragments";
import { SOURCES_INSTRUCTION_SECTION_TITLES } from "./instruction-titles";

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
      title: SOURCES_INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.UI_FRAMEWORK_DETECTION,
      points: [SOURCES_PROMPT_FRAGMENTS.XML_SPECIFIC.UI_FRAMEWORK_DETECTION],
    },
  ],
};
