import { SOURCES_PROMPT_FRAGMENTS, COMPOSITES } from "../sources.fragments";
import { INSTRUCTION_SECTION_TITLES, buildInstructionBlock } from "../../instruction-utils";
import { sourceSummarySchema } from "../../../../schemas/sources.schema";
import {
  createSimpleConfig,
  createBasicInfoBlock,
  type SourceConfigEntry,
} from "./shared-utilities";

/**
 * Source prompt definitions for special file types (SQL, Markdown, XML, JSP, scripts, etc.).
 */
export const specialFileDefinitions: Record<string, SourceConfigEntry> = {
  sql: createSimpleConfig(
    "the database DDL/DML/SQL code",
    ["purpose", "implementation", "tables", "storedProcedures", "triggers", "databaseIntegration"],
    [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        fragments: [
          SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_OBJECTS,
        fragments: [
          SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.TABLE_LIST,
          SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.STORED_PROCEDURE_LIST,
          SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.TRIGGER_LIST,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        fragments: [SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.DB_INTEGRATION_ANALYSIS],
      },
    ],
  ),
  markdown: createSimpleConfig(
    "the Markdown documentation",
    ["purpose", "implementation", "databaseIntegration"],
    [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        fragments: [
          SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        fragments: [COMPOSITES.DB_INTEGRATION, SOURCES_PROMPT_FRAGMENTS.COMMON.DB_IN_DOCUMENTATION],
      },
    ],
  ),
  xml: createSimpleConfig(
    "the XML configuration",
    ["purpose", "implementation", "uiFramework"],
    [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        fragments: [
          SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.UI_FRAMEWORK_DETECTION,
        fragments: [SOURCES_PROMPT_FRAGMENTS.XML_SPECIFIC.UI_FRAMEWORK_DETECTION],
      },
    ],
  ),
  jsp: {
    contentDesc: "the JSP code",
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      dataInputFields: true,
      jspMetrics: true,
    }),
    instructions: [
      createBasicInfoBlock(),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.USER_INPUT_FIELDS,
        SOURCES_PROMPT_FRAGMENTS.JSP_SPECIFIC.DATA_INPUT_FIELDS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        SOURCES_PROMPT_FRAGMENTS.JSP_SPECIFIC.JSP_METRICS_ANALYSIS,
      ),
    ] as const,
  },
  "shell-script": {
    contentDesc: "the Shell script (bash/sh)",
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
    }),
    instructions: [
      createBasicInfoBlock(),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
        SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
        SOURCES_PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.CRON_EXPRESSIONS,
        SOURCES_PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.DATABASE_OPS,
        SOURCES_PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.EXTERNAL_API_CALLS,
      ),
    ] as const,
  },
  "batch-script": {
    contentDesc: "the Windows batch script (.bat/.cmd)",
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
    }),
    instructions: [
      createBasicInfoBlock(),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
        SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
        SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.TASK_SCHEDULER,
        SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.DATABASE_OPS,
        SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.NETWORK_OPS,
        SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.SERVICE_OPS,
      ),
    ] as const,
  },
  jcl: {
    contentDesc: "the Mainframe JCL (Job Control Language)",
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
    }),
    instructions: [
      createBasicInfoBlock(),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
        SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
        SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.EXEC_STATEMENTS,
        SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.DD_STATEMENTS,
        SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.COND_PARAMETERS,
        SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.SORT_UTILITIES,
      ),
    ] as const,
  },
  default: createSimpleConfig(
    "the source files",
    ["purpose", "implementation", "databaseIntegration"],
    [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        fragments: [
          SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        fragments: [COMPOSITES.DB_INTEGRATION, SOURCES_PROMPT_FRAGMENTS.COMMON.DB_IN_FILE],
      },
    ],
  ),
};
