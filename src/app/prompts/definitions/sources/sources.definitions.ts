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

/** Schema type for dependency file configurations */
const dependencyFileSchema = sourceSummarySchema.pick({
  purpose: true,
  implementation: true,
  dependencies: true,
});

/**
 * Factory function to create a dependency file source configuration.
 * This function eliminates duplication for dependency management files by generating
 * a consistent 2-block instruction pattern:
 * 1. Basic Info (purpose and implementation)
 * 2. References and Dependencies (with file-type-specific dependency extraction)
 *
 * @param contentDesc - Description of the content being analyzed (e.g., "Maven POM")
 * @param dependencyFragment - The file-type-specific dependency extraction instructions
 * @returns A SourceConfigEntry with the standard dependency file instruction blocks
 */
function createDependencyConfig(
  contentDesc: string,
  dependencyFragment: string,
): SourceConfigEntry<typeof dependencyFileSchema> {
  return {
    contentDesc,
    responseSchema: dependencyFileSchema,
    instructions: [
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ),
      buildInstructionBlock(INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS, dependencyFragment),
    ],
  };
}

/**
 * Factory function to create a simple source configuration.
 * This function eliminates duplication for simple file types that follow a pattern of
 * BASIC_INFO followed by one or more additional instruction blocks.
 *
 * @param contentDesc - Description of the content being analyzed (e.g., "the Markdown documentation")
 * @param schemaFields - Array of field names to pick from sourceSummarySchema
 * @param instructionBlocks - Array of instruction block configurations, each containing a title and content fragments
 * @returns A SourceConfigEntry with the specified instruction blocks
 */
function createSimpleConfig(
  contentDesc: string,
  schemaFields: readonly string[],
  instructionBlocks: readonly {
    title: string;
    fragments: readonly (string | readonly string[])[];
  }[],
): SourceConfigEntry {
  const pickObject = schemaFields.reduce<Record<string, true>>((acc, field) => {
    acc[field] = true;
    return acc;
  }, {});
  // Type assertion needed because Zod's pick requires exact key matching at compile time
  // but we're building the keys dynamically at runtime
  return {
    contentDesc,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    responseSchema: sourceSummarySchema.pick(pickObject as any),
    instructions: instructionBlocks.map((block) =>
      buildInstructionBlock(block.title, ...block.fragments),
    ) as readonly string[],
  };
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
  java: createStandardCodeConfig("the JVM code", SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC),
  javascript: createStandardCodeConfig(
    "the JavaScript/TypeScript code",
    SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC,
  ),
  csharp: createStandardCodeConfig("the C# code", SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC),
  python: createStandardCodeConfig("the Python code", SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC, {
    extraComplexityMetrics: SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PYTHON_COMPLEXITY_METRICS,
  }),
  ruby: createStandardCodeConfig("the Ruby code", SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC),
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
  maven: createDependencyConfig(
    "the Maven POM (Project Object Model) build file",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.MAVEN,
  ),
  gradle: createDependencyConfig(
    "the Gradle build configuration file",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.GRADLE,
  ),
  ant: createDependencyConfig(
    "the Apache Ant build.xml file",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.ANT,
  ),
  npm: createDependencyConfig(
    "the npm package.json or lock file",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.NPM,
  ),
  "dotnet-proj": createDependencyConfig(
    "the .NET project file (.csproj, .vbproj, .fsproj)",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.DOTNET,
  ),
  nuget: createDependencyConfig(
    "the NuGet packages.config file (legacy .NET)",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.NUGET,
  ),
  "ruby-bundler": createDependencyConfig(
    "the Ruby Gemfile or Gemfile.lock",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.RUBY_BUNDLER,
  ),
  "python-pip": createDependencyConfig(
    "the Python requirements.txt or Pipfile",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_PIP,
  ),
  "python-setup": createDependencyConfig(
    "the Python setup.py file",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_SETUP,
  ),
  "python-poetry": createDependencyConfig(
    "the Python pyproject.toml (Poetry)",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_POETRY,
  ),
  "shell-script": {
    contentDesc: "the Shell script (bash/sh)",
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
    contentDesc: "the Windows batch script (.bat/.cmd)",
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
    contentDesc: "the Mainframe JCL (Job Control Language)",
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
  c: createStandardCodeConfig("the C source code", SOURCES_PROMPT_FRAGMENTS.C_SPECIFIC, {
    useModuleBase: true,
  }),
  cpp: createStandardCodeConfig("the C++ source code", SOURCES_PROMPT_FRAGMENTS.CPP_SPECIFIC),
  makefile: createDependencyConfig(
    "the C/C++ build configuration (CMake or Makefile)",
    SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.MAKEFILE,
  ),
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
} as const satisfies Record<CanonicalFileType, SourceConfigEntry>;

/**
 * Type alias for the sourceConfigMap that preserves specific schema types for each file type.
 * Use this type when you need compile-time access to the exact schema for a specific file type.
 */
export type SourceConfigMap = typeof sourceConfigMap;
