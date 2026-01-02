import { z } from "zod";
import type { CanonicalFileType } from "../../../components/capture/config/file-types.config";
import {
  SOURCES_PROMPT_FRAGMENTS,
  COMPOSITES,
  type LanguageSpecificFragments,
} from "./sources.fragments";
import { INSTRUCTION_SECTION_TITLES, buildInstructionBlock } from "../instruction-utils";
import { sourceSummarySchema, commonSourceAnalysisSchema } from "../../../schemas/sources.schema";
import type { BasePromptConfigEntry } from "../../prompt.types";

/**
 * Configuration entry for a source prompt definition.
 * Extends BasePromptConfigEntry with required contentDesc, responseSchema, and instructions fields.
 * Each entry directly includes the responseSchema using sourceSummarySchema.pick(),
 * making the schemas explicit and type-safe.
 *
 * This interface is generic over the schema type S to preserve specific Zod schema types
 * through the type system, enabling better type inference for downstream consumers.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType for backward compatibility.
 */
export interface SourceConfigEntry<
  S extends z.ZodType = z.ZodType,
> extends BasePromptConfigEntry<S> {
  /** Description of the content being analyzed (required for source configs) */
  contentDesc: string;
  /** Zod schema for validating the LLM response (required for source configs) */
  responseSchema: S;
  /** Array of instruction strings for the LLM (required for source configs) */
  instructions: readonly string[];
}

/**
 * Options for creating a standard code source configuration.
 */
interface StandardCodeConfigOptions {
  /** Whether to use module-based entity (for C) instead of class-based */
  useModuleBase?: boolean;
  /** Additional complexity metrics to include (e.g., Python's complexity metrics) */
  extraComplexityMetrics?: string;
}

/**
 * Factory function to create a standard code source configuration.
 * This function eliminates duplication for standard programming languages by generating
 * the standard 5-block instruction pattern:
 * 1. Basic Info (with language-specific entity base and optional kind override)
 * 2. References and Dependencies
 * 3. Integration Points
 * 4. Database Integration Analysis
 * 5. Code Quality Metrics
 *
 * @param contentDesc - Description of the content being analyzed (e.g., "JVM code")
 * @param fragments - Language-specific instruction fragments
 * @param options - Additional options for customization
 * @returns A SourceConfigEntry with all standard instruction blocks
 */
function createStandardCodeConfig(
  contentDesc: string,
  fragments: LanguageSpecificFragments,
  options: StandardCodeConfigOptions = {},
): SourceConfigEntry<typeof commonSourceAnalysisSchema> {
  const { useModuleBase = false, extraComplexityMetrics } = options;

  // Build basic info block with appropriate base (class or module) and optional kind override
  const basicInfoParts: (string | readonly string[])[] = [
    useModuleBase ? SOURCES_PROMPT_FRAGMENTS.BASE.MODULE : SOURCES_PROMPT_FRAGMENTS.BASE.CLASS,
    SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
    SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
  ];
  if (fragments.KIND_OVERRIDE) {
    basicInfoParts.push(fragments.KIND_OVERRIDE);
  }

  // Determine public API fragment (functions vs methods)
  const publicApiFragment = fragments.PUBLIC_FUNCTIONS ?? fragments.PUBLIC_METHODS ?? "";

  // Build code quality block with optional extra metrics
  const codeQualityParts: (string | readonly string[])[] = [COMPOSITES.CODE_QUALITY];
  if (extraComplexityMetrics) {
    codeQualityParts.push(extraComplexityMetrics);
  }

  return {
    contentDesc,
    responseSchema: commonSourceAnalysisSchema,
    instructions: [
      buildInstructionBlock(INSTRUCTION_SECTION_TITLES.BASIC_INFO, ...basicInfoParts),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        fragments.INTERNAL_REFS,
        fragments.EXTERNAL_REFS,
        fragments.PUBLIC_CONSTANTS,
        publicApiFragment,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
        fragments.INTEGRATION_INSTRUCTIONS,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        COMPOSITES.DB_INTEGRATION,
        fragments.DB_MECHANISM_MAPPING,
      ),
      buildInstructionBlock(INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS, ...codeQualityParts),
    ],
  };
}

/**
 * Centralized configuration for all source prompt definitions.
 * Each entry directly defines its responseSchema using sourceSummarySchema.pick().
 *
 * Standard programming languages (Java, JavaScript, C#, Python, Ruby, C, C++) use the
 * createStandardCodeConfig factory to ensure consistent instruction patterns.
 *
 * The `satisfies` pattern validates that the object conforms to the Record structure
 * while preserving the literal types of each entry (including specific Zod schema types).
 * This enables TypeScript to infer the exact schema type for each file type key.
 */
export const sourceConfigMap = {
  java: createStandardCodeConfig("JVM code", SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC),
  javascript: createStandardCodeConfig(
    "JavaScript/TypeScript code",
    SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC,
  ),
  csharp: createStandardCodeConfig("C# code", SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC),
  python: createStandardCodeConfig("Python code", SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC, {
    extraComplexityMetrics: SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PYTHON_COMPLEXITY_METRICS,
  }),
  ruby: createStandardCodeConfig("Ruby code", SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC),
  sql: {
    contentDesc: "database DDL/DML/SQL code",
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      tables: true,
      storedProcedures: true,
      triggers: true,
      databaseIntegration: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      databaseIntegration: true,
    }),
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        COMPOSITES.DB_INTEGRATION,
        SOURCES_PROMPT_FRAGMENTS.COMMON.DB_IN_DOCUMENTATION,
      ),
    ] as const,
  },
  xml: {
    contentDesc: "XML configuration",
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      uiFramework: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      dataInputFields: true,
      jspMetrics: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
    }),
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
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
    }),
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
  c: createStandardCodeConfig("C source code", SOURCES_PROMPT_FRAGMENTS.C_SPECIFIC, {
    useModuleBase: true,
  }),
  cpp: createStandardCodeConfig("C++ source code", SOURCES_PROMPT_FRAGMENTS.CPP_SPECIFIC),
  makefile: {
    contentDesc: "C/C++ build configuration (CMake or Makefile)",
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.MAKEFILE,
      ),
    ] as const,
  },
  default: {
    contentDesc: "source files",
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      databaseIntegration: true,
    }),
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        COMPOSITES.DB_INTEGRATION,
        SOURCES_PROMPT_FRAGMENTS.COMMON.DB_IN_FILE,
      ),
    ] as const,
  },
} as const satisfies Record<CanonicalFileType, SourceConfigEntry>;

/**
 * Type alias for the sourceConfigMap that preserves specific schema types for each file type.
 * Use this type when you need compile-time access to the exact schema for a specific file type.
 */
export type SourceConfigMap = typeof sourceConfigMap;
