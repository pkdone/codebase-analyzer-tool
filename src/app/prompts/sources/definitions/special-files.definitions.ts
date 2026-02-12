import {
  COMMON_FRAGMENTS,
  SQL_SPECIFIC_FRAGMENTS,
  XML_SPECIFIC_FRAGMENTS,
  JSP_SPECIFIC_FRAGMENTS,
  JAVA_SPECIFIC_FRAGMENTS,
  SHELL_SCRIPT_SPECIFIC_FRAGMENTS,
  BATCH_SCRIPT_SPECIFIC_FRAGMENTS,
  JCL_SPECIFIC_FRAGMENTS,
  PRECONFIGURED_INSTRUCTION_SETS,
} from "../fragments";
import { INSTRUCTION_SECTION_TITLES, buildInstructionBlock } from "../utils";
import {
  createBasicInfoBlock,
  createCompositeSourceConfig,
  createScheduledJobConfig,
  type SourceConfigEntry,
} from "./source-config-factories";
import { sourceSummarySchema } from "../../../schemas/source-file.schema";

/**
 * Literal type for special file types.
 * These are the canonical file types handled by the special/composite configuration factories.
 */
export type SpecialFileType =
  | "sql"
  | "markdown"
  | "xml"
  | "jsp"
  | "shell-script"
  | "batch-script"
  | "jcl"
  | "default";

/**
 * Source prompt definitions for special file types (SQL, Markdown, XML, JSP, scripts, etc.).
 *
 * Uses createCompositeSourceConfig factory for consistency with other definition files.
 *
 * The `satisfies Record<SpecialFileType, ...>` pattern enforces that:
 * 1. All file types defined in SpecialFileType must have corresponding entries
 * 2. No invalid file type keys can be added (compile-time error for typos)
 * 3. The literal key types for each entry are preserved
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
        SQL_SPECIFIC_FRAGMENTS.TABLE_LIST,
        SQL_SPECIFIC_FRAGMENTS.STORED_PROCEDURE_LIST,
        SQL_SPECIFIC_FRAGMENTS.TRIGGER_LIST,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        SQL_SPECIFIC_FRAGMENTS.DB_INTEGRATION_ANALYSIS,
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
        PRECONFIGURED_INSTRUCTION_SETS.DB_INTEGRATION,
        COMMON_FRAGMENTS.DB_IN_DOCUMENTATION,
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
        XML_SPECIFIC_FRAGMENTS.UI_FRAMEWORK_DETECTION,
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
        JAVA_SPECIFIC_FRAGMENTS.INTERNAL_REFS,
        JAVA_SPECIFIC_FRAGMENTS.EXTERNAL_REFS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.USER_INPUT_FIELDS,
        JSP_SPECIFIC_FRAGMENTS.DATA_INPUT_FIELDS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        JSP_SPECIFIC_FRAGMENTS.JSP_METRICS_ANALYSIS,
      ),
    ],
  ),

  "shell-script": createScheduledJobConfig(
    "the Shell script (bash/sh)",
    SHELL_SCRIPT_SPECIFIC_FRAGMENTS.CRON_EXPRESSIONS,
    SHELL_SCRIPT_SPECIFIC_FRAGMENTS.DATABASE_OPS,
    SHELL_SCRIPT_SPECIFIC_FRAGMENTS.EXTERNAL_API_CALLS,
  ),

  "batch-script": createScheduledJobConfig(
    "the Windows batch script (.bat/.cmd)",
    BATCH_SCRIPT_SPECIFIC_FRAGMENTS.TASK_SCHEDULER,
    BATCH_SCRIPT_SPECIFIC_FRAGMENTS.DATABASE_OPS,
    BATCH_SCRIPT_SPECIFIC_FRAGMENTS.NETWORK_OPS,
    BATCH_SCRIPT_SPECIFIC_FRAGMENTS.SERVICE_OPS,
  ),

  jcl: createScheduledJobConfig(
    "the Mainframe JCL (Job Control Language)",
    JCL_SPECIFIC_FRAGMENTS.EXEC_STATEMENTS,
    JCL_SPECIFIC_FRAGMENTS.DD_STATEMENTS,
    JCL_SPECIFIC_FRAGMENTS.COND_PARAMETERS,
    JCL_SPECIFIC_FRAGMENTS.SORT_UTILITIES,
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
        PRECONFIGURED_INSTRUCTION_SETS.DB_INTEGRATION,
        COMMON_FRAGMENTS.DB_IN_FILE,
      ),
    ],
  ),
} satisfies Record<SpecialFileType, SourceConfigEntry>;
