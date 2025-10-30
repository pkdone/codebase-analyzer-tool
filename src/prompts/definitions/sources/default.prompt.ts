import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_PROMPT_FRAGMENTS } from "./common-fragments";
import { SOURCES_INSTRUCTION_SECTION_TITLES } from "./instruction-titles";

export const defaultPrompt: SourcePromptTemplate = {
  contentDesc: "project file content",
  hasComplexSchema: true,
  responseSchema: sourceSummarySchema.pick({
    purpose: true,
    implementation: true,
    databaseIntegration: true,
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
      title: SOURCES_INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION,
      points: [SOURCES_PROMPT_FRAGMENTS.DB_INTEGRATION.INTRO],
    },
  ],
};
