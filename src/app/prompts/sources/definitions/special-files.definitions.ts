import { SOURCES_PROMPT_FRAGMENTS, COMPOSITES } from "../sources.fragments";
import { INSTRUCTION_SECTION_TITLES, buildInstructionBlock } from "../utils";
import {
  createBasicInfoBlock,
  createCompositeSourceConfig,
  createScheduledJobConfig,
  type SourceConfigEntry,
} from "./source-config-factories";
import { sourceSummarySchema } from "../../../schemas/sources.schema";

/**
 * Source prompt definitions for special file types (SQL, Markdown, XML, JSP, scripts, etc.).
 *
 * Uses createCompositeSourceConfig factory for consistency with other definition files.
 * The `satisfies` pattern validates that the object conforms to the Record structure
 * while preserving the literal key types for each entry.
 */
export const specialFileDefinitions = {
  sql: createCompositeSourceConfig(
    "the database DDL/DML/SQL code",
    sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      tables: true,
      storedProcedures: true,
      triggers: true,
      databaseIntegration: true,
    }),
    [
      createBasicInfoBlock(),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_OBJECTS,
        SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.TABLE_LIST,
        SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.STORED_PROCEDURE_LIST,
        SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.TRIGGER_LIST,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.DB_INTEGRATION_ANALYSIS,
      ),
    ],
    true,
  ),

  markdown: createCompositeSourceConfig(
    "the Markdown documentation",
    sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      databaseIntegration: true,
    }),
    [
      createBasicInfoBlock(),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        COMPOSITES.DB_INTEGRATION,
        SOURCES_PROMPT_FRAGMENTS.COMMON.DB_IN_DOCUMENTATION,
      ),
    ],
  ),

  xml: createCompositeSourceConfig(
    "the XML configuration",
    sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      uiFramework: true,
    }),
    [
      createBasicInfoBlock(),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.UI_FRAMEWORK_DETECTION,
        SOURCES_PROMPT_FRAGMENTS.XML_SPECIFIC.UI_FRAMEWORK_DETECTION,
      ),
    ],
  ),

  jsp: createCompositeSourceConfig(
    "the JSP code",
    sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      dataInputFields: true,
      jspMetrics: true,
    }),
    [
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
    ],
  ),

  "shell-script": createScheduledJobConfig(
    "the Shell script (bash/sh)",
    SOURCES_PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.CRON_EXPRESSIONS,
    SOURCES_PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.DATABASE_OPS,
    SOURCES_PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.EXTERNAL_API_CALLS,
  ),

  "batch-script": createScheduledJobConfig(
    "the Windows batch script (.bat/.cmd)",
    SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.TASK_SCHEDULER,
    SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.DATABASE_OPS,
    SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.NETWORK_OPS,
    SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.SERVICE_OPS,
  ),

  jcl: createScheduledJobConfig(
    "the Mainframe JCL (Job Control Language)",
    SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.EXEC_STATEMENTS,
    SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.DD_STATEMENTS,
    SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.COND_PARAMETERS,
    SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.SORT_UTILITIES,
  ),

  default: createCompositeSourceConfig(
    "the source files",
    sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      databaseIntegration: true,
    }),
    [
      createBasicInfoBlock(),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        COMPOSITES.DB_INTEGRATION,
        SOURCES_PROMPT_FRAGMENTS.COMMON.DB_IN_FILE,
      ),
    ],
  ),
} satisfies Record<string, SourceConfigEntry>;
