import type { CanonicalFileType } from "../../../config/file-types.config";
import {
  SOURCES_PROMPT_FRAGMENTS,
  CLASS_LANGUAGE_BASE_INSTRUCTIONS,
  CODE_QUALITY_INSTRUCTIONS,
  DB_INTEGRATION_INSTRUCTIONS,
} from "./sources.fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";
import { buildInstructionBlock } from "../../prompt-utils";

/**
 * Configuration entry for a source prompt definition
 */
export interface SourceConfigEntry {
  contentDesc: string;
  hasComplexSchema?: boolean; // Defaults to true when undefined
  schemaFields: string[];
  instructions: readonly string[];
  // responseSchema is optional - sources build schema via pick() in the factory
}

/**
 * Centralized configuration for all source prompt definitions.
 * This replaces the individual prompt definition files with a data-driven approach.
 */
export const sourceConfigMap: Record<CanonicalFileType, SourceConfigEntry> = {
  java: {
    contentDesc: "JVM code",
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
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        CLASS_LANGUAGE_BASE_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.PUBLIC_CONSTANTS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.PUBLIC_METHODS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.DB_MECHANISM_MAPPING,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        CODE_QUALITY_INSTRUCTIONS,
      ),
    ] as const,
  },
  javascript: {
    contentDesc: "JavaScript/TypeScript code",
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
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        CLASS_LANGUAGE_BASE_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.PUBLIC_CONSTANTS,
        SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.PUBLIC_METHODS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.DB_MECHANISM_MAPPING,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        CODE_QUALITY_INSTRUCTIONS,
      ),
    ] as const,
  },
  csharp: {
    contentDesc: "C# code",
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
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        CLASS_LANGUAGE_BASE_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.KIND_OVERRIDE,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.INTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.EXTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.PUBLIC_CONSTANTS,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.PUBLIC_METHODS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.DB_MECHANISM_MAPPING,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        CODE_QUALITY_INSTRUCTIONS,
      ),
    ] as const,
  },
  python: {
    contentDesc: "Python code",
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
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        CLASS_LANGUAGE_BASE_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
        SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.KIND_OVERRIDE,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.INTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.EXTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_CONSTANTS,
        SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_METHODS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.DB_MECHANISM_MAPPING,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        CODE_QUALITY_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PYTHON_COMPLEXITY_METRICS,
      ),
    ] as const,
  },
  ruby: {
    contentDesc: "Ruby code",
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
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        CLASS_LANGUAGE_BASE_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
        SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.KIND_OVERRIDE,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.INTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.EXTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_CONSTANTS,
        SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_METHODS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.DB_MECHANISM_MAPPING,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        CODE_QUALITY_INSTRUCTIONS,
      ),
    ] as const,
  },
  sql: {
    contentDesc: "database DDL/DML/SQL code",
    schemaFields: [
      "purpose",
      "implementation",
      "tables",
      "storedProcedures",
      "triggers",
      "databaseIntegration",
    ],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
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
    ] as const,
  },
  markdown: {
    contentDesc: "Markdown documentation",
    schemaFields: ["purpose", "implementation", "databaseIntegration"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.COMMON.DB_IN_DOCUMENTATION,
      ),
    ] as const,
  },
  xml: {
    contentDesc: "XML configuration",
    schemaFields: ["purpose", "implementation", "uiFramework"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.UI_FRAMEWORK_DETECTION,
        SOURCES_PROMPT_FRAGMENTS.XML_SPECIFIC.UI_FRAMEWORK_DETECTION,
      ),
    ] as const,
  },
  jsp: {
    contentDesc: "JSP code",
    schemaFields: [
      "purpose",
      "implementation",
      "internalReferences",
      "externalReferences",
      "dataInputFields",
      "jspMetrics",
    ],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
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
  maven: {
    contentDesc: "Maven POM (Project Object Model) build file",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.MAVEN,
      ),
    ] as const,
  },
  gradle: {
    contentDesc: "Gradle build configuration file",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.GRADLE,
      ),
    ] as const,
  },
  ant: {
    contentDesc: "Apache Ant build.xml file",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.ANT,
      ),
    ] as const,
  },
  npm: {
    contentDesc: "npm package.json or lock file",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.NPM,
      ),
    ] as const,
  },
  "dotnet-proj": {
    contentDesc: ".NET project file (.csproj, .vbproj, .fsproj)",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.DOTNET,
      ),
    ] as const,
  },
  nuget: {
    contentDesc: "NuGet packages.config file (legacy .NET)",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.NUGET,
      ),
    ] as const,
  },
  "ruby-bundler": {
    contentDesc: "Ruby Gemfile or Gemfile.lock",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.RUBY_BUNDLER,
      ),
    ] as const,
  },
  "python-pip": {
    contentDesc: "Python requirements.txt or Pipfile",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_PIP,
      ),
    ] as const,
  },
  "python-setup": {
    contentDesc: "Python setup.py file",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_SETUP,
      ),
    ] as const,
  },
  "python-poetry": {
    contentDesc: "Python pyproject.toml (Poetry)",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_POETRY,
      ),
    ] as const,
  },
  "shell-script": {
    contentDesc: "Shell script (bash/sh)",
    schemaFields: ["purpose", "implementation", "scheduledJobs"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
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
    contentDesc: "Windows batch script (.bat/.cmd)",
    schemaFields: ["purpose", "implementation", "scheduledJobs"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
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
    contentDesc: "Mainframe JCL (Job Control Language)",
    schemaFields: ["purpose", "implementation", "scheduledJobs"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
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
  default: {
    contentDesc: "source files",
    schemaFields: ["purpose", "implementation", "databaseIntegration"],
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.COMMON.DB_IN_FILE,
      ),
    ] as const,
  },
} as const;
