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
          "A list of any constants or configuration values defined in this file",
          "A list of any functions or procedures defined in this file",
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
    contentDesc: "SQL code",
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
          "A list of internal references to other SQL files or database objects in the same project",
          "A list of external references to external databases, schemas, or resources",
          "A list of any constants or configuration values defined in this SQL file",
          "A list of any functions or procedures defined in this SQL file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          "Look for database connections, API calls, or other integration points in the SQL file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          "Look for database schemas, tables, views, stored procedures, and functions in the SQL file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: [
          ...CODE_QUALITY_INSTRUCTIONS,
          "A list of functions defined in this SQL file",
          "A list of stored procedures defined in this SQL file",
          "A list of triggers defined in this SQL file",
        ],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  markdown: {
    contentDesc: "Markdown documentation",
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
          "A list of internal references to other documentation files in the same project",
          "A list of external references to external documentation, websites, or resources",
          "A list of any constants or configuration values defined in this documentation",
          "A list of any procedures or methods documented in this file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          "Look for API endpoints, webhooks, or integration points mentioned in the documentation",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          "Look for database schemas, queries, or data models mentioned in the documentation",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  xml: {
    contentDesc: "XML configuration",
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
          "A list of internal references to other configuration files in the same project",
          "A list of external references to external schemas, DTDs, or configuration files",
          "A list of any constants or configuration values defined in this XML file",
          "A list of any procedures or methods referenced in this configuration",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          "Look for servlet mappings, web services, or other integration points in the XML configuration",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          "Look for database connection configurations, data sources, or ORM settings in the XML file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: [
          ...CODE_QUALITY_INSTRUCTIONS,
          SOURCES_FRAGMENTS.XML_SPECIFIC.UI_FRAMEWORK_DETECTION,
        ],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  jsp: {
    contentDesc: "JSP page",
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
          "A list of internal references to other JSP pages, servlets, or Java classes in the same application",
          "A list of external references to external libraries, frameworks, or resources",
          "A list of any constants or configuration values defined in this JSP page",
          "A list of any procedures or methods defined in this JSP page",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          "Look for form actions, AJAX calls, or other integration points in the JSP page",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          "Look for database queries, JDBC connections, or ORM usage in the JSP page",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: [
          ...CODE_QUALITY_INSTRUCTIONS,
          SOURCES_FRAGMENTS.JSP_SPECIFIC.DATA_INPUT_FIELDS,
          SOURCES_FRAGMENTS.JSP_SPECIFIC.JSP_METRICS_ANALYSIS,
        ],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  // Build system files - use simpler instructions
  maven: {
    contentDesc: "Maven POM file",
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
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  gradle: {
    contentDesc: "Gradle build file",
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
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  ant: {
    contentDesc: "Ant build file",
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
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  npm: {
    contentDesc: "NPM package file",
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
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "dotnet-proj": {
    contentDesc: "dotnet project file",
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
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  nuget: {
    contentDesc: "NuGet package file",
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
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "ruby-bundler": {
    contentDesc: "Ruby Gemfile",
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
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "python-pip": {
    contentDesc: "Python requirements file",
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
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "python-setup": {
    contentDesc: "Python setup.py file",
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
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "python-poetry": {
    contentDesc: "Python pyproject.toml file",
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
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "shell-script": {
    contentDesc: "Shell script",
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
          "A list of internal references to other scripts or files in the same project",
          "A list of external references to external commands, tools, or resources",
          "A list of any constants or configuration values defined in this script",
          "A list of any functions or procedures defined in this script",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          "Look for API calls, webhooks, or other integration points in the script",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          "Look for database commands, queries, or connections in the script",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: [
          ...CODE_QUALITY_INSTRUCTIONS,
          "Look for scheduled jobs, cron expressions, or automated tasks in the script",
          "A list of scheduled jobs or automated tasks defined in this script",
        ],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  "batch-script": {
    contentDesc: "Batch script",
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
          "A list of internal references to other batch files or scripts in the same project",
          "A list of external references to external commands, tools, or resources",
          "A list of any constants or configuration values defined in this batch file",
          "A list of any functions or procedures defined in this batch file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          "Look for API calls, webhooks, or other integration points in the batch file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          "Look for database commands, queries, or connections in the batch file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: [
          ...CODE_QUALITY_INSTRUCTIONS,
          "Look for scheduled jobs, task scheduler references, or automated tasks in the batch file",
          "A list of scheduled jobs or automated tasks defined in this batch file",
        ],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  jcl: {
    contentDesc: "JCL job control language",
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
          "A list of internal references to other JCL jobs or programs in the same system",
          "A list of external references to external programs, utilities, or resources",
          "A list of any constants or configuration values defined in this JCL job",
          "A list of any procedures or subroutines defined in this JCL job",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          "Look for program calls, data transfers, or other integration points in the JCL job",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          "Look for database operations, queries, or connections in the JCL job",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: [
          ...CODE_QUALITY_INSTRUCTIONS,
          "Look for scheduled jobs, job dependencies, or automated tasks in the JCL job",
          "A list of scheduled jobs or automated tasks defined in this JCL job",
        ],
      },
    ],
    template: SOURCES_TEMPLATE,
  },
  default: {
    contentDesc: "source files",
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
          "A list of internal references to other files in the same project",
          "A list of external references to external libraries, frameworks, or resources",
          "A list of any constants or configuration values defined in this file",
          "A list of any functions or procedures defined in this file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          "Look for API calls, webhooks, or other integration points in the file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          "Look for database operations, queries, or connections in the file",
        ],
      },
      {
        title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
    template: SOURCES_TEMPLATE,
  },
} as const;
