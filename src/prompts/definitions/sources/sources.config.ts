import { CanonicalFileType } from "../../prompt.types";
import {
  SOURCES_FRAGMENTS,
  CLASS_LANGUAGE_BASE_INSTRUCTIONS,
  CODE_QUALITY_INSTRUCTIONS,
  DB_INTEGRATION_INSTRUCTIONS,
} from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";
import { SOURCES_TEMPLATE } from "../../prompt";
import { InstructionSection } from "../../prompt.types";

/**
 * Configuration entry for a source prompt definition
 */
interface SourceConfigEntry {
  contentDesc: string;
  hasComplexSchema?: boolean; // Defaults to false when undefined
  schemaFields: string[];
  instructions: readonly InstructionSection[];
  template: string;
}

/**
 * Centralized configuration for all source prompt definitions.
 * This replaces the individual prompt definition files with a data-driven approach.
 */
export const sourceConfigMap: Record<CanonicalFileType, SourceConfigEntry> = {
  java: {
    contentDesc: "JVM code",
    hasComplexSchema: true,
    schemaFields: [
      "name",
      "kind",
      "namespace",
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "publicConstants",
      "publicMethods",
      "databaseIntegration",
      "integrationPoints",
      "codeQualityMetrics",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          SOURCES_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS,
          SOURCES_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS,
          SOURCES_FRAGMENTS.JAVA_SPECIFIC.PUBLIC_CONSTANTS,
          SOURCES_FRAGMENTS.JAVA_SPECIFIC.PUBLIC_METHODS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          SOURCES_FRAGMENTS.JAVA_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          SOURCES_FRAGMENTS.JAVA_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  javascript: {
    contentDesc: "JavaScript/TypeScript code",
    hasComplexSchema: true,
    schemaFields: [
      "name",
      "kind",
      "namespace",
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "publicConstants",
      "publicMethods",
      "databaseIntegration",
      "integrationPoints",
      "codeQualityMetrics",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS,
          SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS,
          "A list of any exported constants or configuration values defined in this file",
          "A list of any exported functions or procedures defined in this file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  csharp: {
    contentDesc: "C# code",
    hasComplexSchema: true,
    schemaFields: [
      "name",
      "kind",
      "namespace",
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "publicConstants",
      "publicMethods",
      "databaseIntegration",
      "integrationPoints",
      "codeQualityMetrics",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
          SOURCES_FRAGMENTS.CSHARP_SPECIFIC.KIND_OVERRIDE,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          SOURCES_FRAGMENTS.CSHARP_SPECIFIC.INTERNAL_REFS,
          SOURCES_FRAGMENTS.CSHARP_SPECIFIC.EXTERNAL_REFS,
          SOURCES_FRAGMENTS.CSHARP_SPECIFIC.PUBLIC_CONSTANTS,
          SOURCES_FRAGMENTS.CSHARP_SPECIFIC.PUBLIC_METHODS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          SOURCES_FRAGMENTS.CSHARP_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          SOURCES_FRAGMENTS.CSHARP_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  python: {
    contentDesc: "Python code",
    hasComplexSchema: true,
    schemaFields: [
      "name",
      "kind",
      "namespace",
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "publicConstants",
      "publicMethods",
      "databaseIntegration",
      "integrationPoints",
      "codeQualityMetrics",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
          SOURCES_FRAGMENTS.PYTHON_SPECIFIC.KIND_OVERRIDE,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          SOURCES_FRAGMENTS.PYTHON_SPECIFIC.INTERNAL_REFS,
          SOURCES_FRAGMENTS.PYTHON_SPECIFIC.EXTERNAL_REFS,
          SOURCES_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_CONSTANTS,
          SOURCES_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_METHODS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          SOURCES_FRAGMENTS.PYTHON_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          SOURCES_FRAGMENTS.PYTHON_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: [
          ...CODE_QUALITY_INSTRUCTIONS,
          SOURCES_FRAGMENTS.PYTHON_SPECIFIC.PYTHON_COMPLEXITY_METRICS,
        ],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  ruby: {
    contentDesc: "Ruby code",
    hasComplexSchema: true,
    schemaFields: [
      "name",
      "kind",
      "namespace",
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "publicConstants",
      "publicMethods",
      "databaseIntegration",
      "integrationPoints",
      "codeQualityMetrics",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
          SOURCES_FRAGMENTS.RUBY_SPECIFIC.KIND_OVERRIDE,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          SOURCES_FRAGMENTS.RUBY_SPECIFIC.INTERNAL_REFS,
          SOURCES_FRAGMENTS.RUBY_SPECIFIC.EXTERNAL_REFS,
          SOURCES_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_CONSTANTS,
          SOURCES_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_METHODS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          SOURCES_FRAGMENTS.RUBY_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          SOURCES_FRAGMENTS.RUBY_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  sql: {
    contentDesc: "database DDL/DML/SQL code",
    hasComplexSchema: true,
    schemaFields: [
      "purpose",
      "implementation",
      "tables",
      "storedProcedures",
      "triggers",
      "databaseIntegration",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_OBJECTS,
        points: [
          SOURCES_FRAGMENTS.SQL_SPECIFIC.TABLE_LIST,
          SOURCES_FRAGMENTS.SQL_SPECIFIC.STORED_PROCEDURE_LIST,
          SOURCES_FRAGMENTS.SQL_SPECIFIC.TRIGGER_LIST,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [SOURCES_FRAGMENTS.SQL_SPECIFIC.DB_INTEGRATION_ANALYSIS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  markdown: {
    contentDesc: "Markdown documentation",
    schemaFields: [
      "purpose",
      "implementation",
      "databaseIntegration",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          "Look for database schemas, queries, or data models mentioned in the documentation",
        ],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  xml: {
    contentDesc: "XML configuration",
    hasComplexSchema: true,
    schemaFields: [
      "purpose",
      "implementation",
      "uiFramework",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.UI_FRAMEWORK_DETECTION,
        points: [
          SOURCES_FRAGMENTS.XML_SPECIFIC.UI_FRAMEWORK_DETECTION,
        ],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  jsp: {
    contentDesc: "JSP code",
    hasComplexSchema: true,
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "dataInputFields",
      "jspMetrics",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          SOURCES_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS,
          SOURCES_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.USER_INPUT_FIELDS,
        points: [SOURCES_FRAGMENTS.JSP_SPECIFIC.DATA_INPUT_FIELDS],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: [SOURCES_FRAGMENTS.JSP_SPECIFIC.JSP_METRICS_ANALYSIS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  maven: {
    contentDesc: "Maven POM file",
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "integrationPoints",
      "databaseIntegration",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [SOURCES_FRAGMENTS.DEPENDENCY_EXTRACTION.MAVEN],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  gradle: {
    contentDesc: "Gradle build file",
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "integrationPoints",
      "databaseIntegration",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [SOURCES_FRAGMENTS.DEPENDENCY_EXTRACTION.GRADLE],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  ant: {
    contentDesc: "Ant build file",
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "databaseIntegration",
      "integrationPoints",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [SOURCES_FRAGMENTS.DEPENDENCY_EXTRACTION.ANT],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  npm: {
    contentDesc: "NPM package file",
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "databaseIntegration",
      "integrationPoints",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [SOURCES_FRAGMENTS.DEPENDENCY_EXTRACTION.NPM],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "dotnet-proj": {
    contentDesc: "dotnet project file",
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "databaseIntegration",
      "integrationPoints",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [SOURCES_FRAGMENTS.DEPENDENCY_EXTRACTION.DOTNET],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  nuget: {
    contentDesc: "NuGet package file",
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "databaseIntegration",
      "integrationPoints",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [SOURCES_FRAGMENTS.DEPENDENCY_EXTRACTION.NUGET],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "ruby-bundler": {
    contentDesc: "Ruby Gemfile",
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "databaseIntegration",
      "integrationPoints",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [SOURCES_FRAGMENTS.DEPENDENCY_EXTRACTION.RUBY_BUNDLER],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "python-pip": {
    contentDesc: "Python requirements file",
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "databaseIntegration",
      "integrationPoints",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [SOURCES_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_PIP],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "python-setup": {
    contentDesc: "Python setup.py file",
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "databaseIntegration",
      "integrationPoints",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [SOURCES_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_SETUP],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "python-poetry": {
    contentDesc: "Python pyproject.toml file",
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "databaseIntegration",
      "integrationPoints",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [SOURCES_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_POETRY],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "shell-script": {
    contentDesc: "Shell script (bash/sh)",
    schemaFields: [
      "purpose",
      "implementation",
      "scheduledJobs",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
        points: [
          SOURCES_FRAGMENTS.SCHEDULED_JOBS.INTRO,
          SOURCES_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
          SOURCES_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.CRON_EXPRESSIONS,
          SOURCES_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.DATABASE_OPS,
          SOURCES_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.EXTERNAL_API_CALLS,
        ],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "batch-script": {
    contentDesc: "Windows batch script (.bat/.cmd)",
    schemaFields: [
      "purpose",
      "implementation",
      "scheduledJobs",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
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
    template: SOURCES_TEMPLATE,
  },
  jcl: {
    contentDesc: "Mainframe JCL (Job Control Language)",
    schemaFields: [
      "purpose",
      "implementation",
      "scheduledJobs",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
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
    template: SOURCES_TEMPLATE,
  },
  default: {
    contentDesc: "source files",
    schemaFields: [
      "purpose",
      "implementation",
      "databaseIntegration",
    ],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          "Look for database operations, queries, or connections in the file",
        ],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
} as const;
