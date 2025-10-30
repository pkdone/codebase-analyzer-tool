import { sourceSummarySchema } from "../../../schemas/sources.schema";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_FRAGMENTS } from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";

export const batchscriptPrompt: SourcePromptTemplate = {
  contentDesc: "Windows batch script (.bat/.cmd)",
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
        SOURCES_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.TASK_SCHEDULER,
        SOURCES_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.DATABASE_OPS,
        SOURCES_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.NETWORK_OPS,
        SOURCES_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.SERVICE_OPS,
      ],
    },
  ],
};
