import { CanonicalFileType } from "../../prompt.types";
import {
  PROMPT_FRAGMENTS,
  CLASS_LANGUAGE_BASE_INSTRUCTIONS,
  CODE_QUALITY_INSTRUCTIONS,
  DB_INTEGRATION_INSTRUCTIONS,
} from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";
import { InstructionSection } from "../../prompt.types";

/**
 * Configuration entry for a source prompt definition
 */
export interface SourceConfigEntry {
  contentDesc: string;
  hasComplexSchema?: boolean; // Defaults to true when undefined
  schemaFields: string[];
  instructions: readonly InstructionSection[];
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
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
          PROMPT_FRAGMENTS.COMMON.PURPOSE,
          PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS,
          PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS,
          PROMPT_FRAGMENTS.JAVA_SPECIFIC.PUBLIC_CONSTANTS,
          PROMPT_FRAGMENTS.JAVA_SPECIFIC.PUBLIC_METHODS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          PROMPT_FRAGMENTS.JAVA_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
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
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
          PROMPT_FRAGMENTS.COMMON.PURPOSE,
          PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS,
          PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS,
          PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.PUBLIC_CONSTANTS,
          PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.PUBLIC_METHODS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
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
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
          PROMPT_FRAGMENTS.COMMON.PURPOSE,
          PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
          PROMPT_FRAGMENTS.CSHARP_SPECIFIC.KIND_OVERRIDE,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          PROMPT_FRAGMENTS.CSHARP_SPECIFIC.INTERNAL_REFS,
          PROMPT_FRAGMENTS.CSHARP_SPECIFIC.EXTERNAL_REFS,
          PROMPT_FRAGMENTS.CSHARP_SPECIFIC.PUBLIC_CONSTANTS,
          PROMPT_FRAGMENTS.CSHARP_SPECIFIC.PUBLIC_METHODS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          PROMPT_FRAGMENTS.CSHARP_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          PROMPT_FRAGMENTS.CSHARP_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
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
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
          PROMPT_FRAGMENTS.COMMON.PURPOSE,
          PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
          PROMPT_FRAGMENTS.PYTHON_SPECIFIC.KIND_OVERRIDE,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          PROMPT_FRAGMENTS.PYTHON_SPECIFIC.INTERNAL_REFS,
          PROMPT_FRAGMENTS.PYTHON_SPECIFIC.EXTERNAL_REFS,
          PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_CONSTANTS,
          PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_METHODS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          PROMPT_FRAGMENTS.PYTHON_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          PROMPT_FRAGMENTS.PYTHON_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: [
          ...CODE_QUALITY_INSTRUCTIONS,
          PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PYTHON_COMPLEXITY_METRICS,
        ],
      },
    ],
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
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
          PROMPT_FRAGMENTS.COMMON.PURPOSE,
          PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
          PROMPT_FRAGMENTS.RUBY_SPECIFIC.KIND_OVERRIDE,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          PROMPT_FRAGMENTS.RUBY_SPECIFIC.INTERNAL_REFS,
          PROMPT_FRAGMENTS.RUBY_SPECIFIC.EXTERNAL_REFS,
          PROMPT_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_CONSTANTS,
          PROMPT_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_METHODS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          PROMPT_FRAGMENTS.RUBY_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          PROMPT_FRAGMENTS.RUBY_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
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
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_OBJECTS,
        points: [
          PROMPT_FRAGMENTS.SQL_SPECIFIC.TABLE_LIST,
          PROMPT_FRAGMENTS.SQL_SPECIFIC.STORED_PROCEDURE_LIST,
          PROMPT_FRAGMENTS.SQL_SPECIFIC.TRIGGER_LIST,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [PROMPT_FRAGMENTS.SQL_SPECIFIC.DB_INTEGRATION_ANALYSIS],
      },
    ],
  },
  markdown: {
    contentDesc: "Markdown documentation",
    schemaFields: ["purpose", "implementation", "databaseIntegration"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS, PROMPT_FRAGMENTS.COMMON.DB_IN_DOCUMENTATION],
      },
    ],
  },
  xml: {
    contentDesc: "XML configuration",
    schemaFields: ["purpose", "implementation", "uiFramework"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.UI_FRAMEWORK_DETECTION,
        points: [PROMPT_FRAGMENTS.XML_SPECIFIC.UI_FRAMEWORK_DETECTION],
      },
    ],
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
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS,
          PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS,
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.USER_INPUT_FIELDS,
        points: [PROMPT_FRAGMENTS.JSP_SPECIFIC.DATA_INPUT_FIELDS],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: [PROMPT_FRAGMENTS.JSP_SPECIFIC.JSP_METRICS_ANALYSIS],
      },
    ],
  },
  maven: {
    contentDesc: "Maven POM (Project Object Model) build file",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.MAVEN],
      },
    ],
  },
  gradle: {
    contentDesc: "Gradle build configuration file",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.GRADLE],
      },
    ],
  },
  ant: {
    contentDesc: "Apache Ant build.xml file",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.ANT],
      },
    ],
  },
  npm: {
    contentDesc: "npm package.json or lock file",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.NPM],
      },
    ],
  },
  "dotnet-proj": {
    contentDesc: ".NET project file (.csproj, .vbproj, .fsproj)",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.DOTNET],
      },
    ],
  },
  nuget: {
    contentDesc: "NuGet packages.config file (legacy .NET)",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.NUGET],
      },
    ],
  },
  "ruby-bundler": {
    contentDesc: "Ruby Gemfile or Gemfile.lock",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.RUBY_BUNDLER],
      },
    ],
  },
  "python-pip": {
    contentDesc: "Python requirements.txt or Pipfile",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_PIP],
      },
    ],
  },
  "python-setup": {
    contentDesc: "Python setup.py file",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_SETUP],
      },
    ],
  },
  "python-poetry": {
    contentDesc: "Python pyproject.toml (Poetry)",
    schemaFields: ["purpose", "implementation", "dependencies"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_POETRY],
      },
    ],
  },
  "shell-script": {
    contentDesc: "Shell script (bash/sh)",
    schemaFields: ["purpose", "implementation", "scheduledJobs"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
        points: [
          PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
          PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
          PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.CRON_EXPRESSIONS,
          PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.DATABASE_OPS,
          PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.EXTERNAL_API_CALLS,
        ],
      },
    ],
  },
  "batch-script": {
    contentDesc: "Windows batch script (.bat/.cmd)",
    schemaFields: ["purpose", "implementation", "scheduledJobs"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
        points: [
          PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
          PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
          PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.TASK_SCHEDULER,
          PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.DATABASE_OPS,
          PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.NETWORK_OPS,
          PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.SERVICE_OPS,
        ],
      },
    ],
  },
  jcl: {
    contentDesc: "Mainframe JCL (Job Control Language)",
    schemaFields: ["purpose", "implementation", "scheduledJobs"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
        points: [
          PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
          PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
          PROMPT_FRAGMENTS.JCL_SPECIFIC.EXEC_STATEMENTS,
          PROMPT_FRAGMENTS.JCL_SPECIFIC.DD_STATEMENTS,
          PROMPT_FRAGMENTS.JCL_SPECIFIC.COND_PARAMETERS,
          PROMPT_FRAGMENTS.JCL_SPECIFIC.SORT_UTILITIES,
        ],
      },
    ],
  },
  default: {
    contentDesc: "source files",
    schemaFields: ["purpose", "implementation", "databaseIntegration"],
    instructions: [
      {
        title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [PROMPT_FRAGMENTS.COMMON.PURPOSE, PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [...DB_INTEGRATION_INSTRUCTIONS, PROMPT_FRAGMENTS.COMMON.DB_IN_FILE],
      },
    ],
  },
} as const;
