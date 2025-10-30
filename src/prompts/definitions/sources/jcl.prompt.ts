import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_PROMPT_FRAGMENTS } from "./common-fragments";
import { SOURCES_INSTRUCTION_SECTION_TITLES } from "./instruction-titles";

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
      title: SOURCES_INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
      points: [
        SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
        SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.EXEC_STATEMENTS,
        SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.DD_STATEMENTS,
        SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.COND_PARAMETERS,
        SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.SORT_UTILITIES,
      ],
    },
  ],
};
