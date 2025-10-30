import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_FRAGMENTS } from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";

export const jclPrompt: SourcePromptTemplate = {
  contentDesc: "Mainframe JCL (Job Control Language)",
  hasComplexSchema: true,
  responseSchema: sourceSummarySchema.pick({
    purpose: true,
    implementation: true,
    scheduledJobs: true,
  }),
  instructions: [
    {
      title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [SOURCES_FRAGMENTS.COMMON.PURPOSE, SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
      points: [
        SOURCES_FRAGMENTS.SCHEDULED_JOBS.INTRO,
        SOURCES_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
        SOURCES_FRAGMENTS.JCL_SPECIFIC.EXEC_STATEMENTS,
        SOURCES_FRAGMENTS.JCL_SPECIFIC.DD_STATEMENTS,
        SOURCES_FRAGMENTS.JCL_SPECIFIC.COND_PARAMETERS,
        SOURCES_FRAGMENTS.JCL_SPECIFIC.SORT_UTILITIES,
      ],
    },
  ],
};
