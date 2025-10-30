import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_FRAGMENTS } from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";

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
      title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [SOURCES_FRAGMENTS.COMMON.PURPOSE, SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION,
      points: [SOURCES_FRAGMENTS.DB_INTEGRATION.INTRO],
    },
  ],
};
