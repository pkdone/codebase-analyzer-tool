import { z } from "zod";
import {
  SOURCES_PROMPT_FRAGMENTS,
  COMPOSITES,
  type LanguageSpecificFragments,
} from "../sources.fragments";
import { sourceSummarySchema, commonSourceAnalysisSchema } from "../../../schemas/sources.schema";

/**
 * Standardized section titles for source file instruction-based prompts.
 * These constants ensure consistency and prevent typos across all source prompt definitions.
 */
export const INSTRUCTION_SECTION_TITLES = {
  BASIC_INFO: "Basic Information",
  CLASS_INFO: "Class Information",
  MODULE_INFO: "Module Information",
  PURPOSE_AND_IMPLEMENTATION: "Purpose and Implementation",
  REFERENCES: "References",
  REFERENCES_AND_DEPS: "References and Dependencies",
  PUBLIC_API: "Public API",
  USER_INPUT_FIELDS: "User Input Fields",
  INTEGRATION_POINTS: "Integration Points",
  DATABASE_INTEGRATION: "Database Integration",
  DATABASE_INTEGRATION_ANALYSIS: "Database Integration Analysis",
  CODE_QUALITY_METRICS: "Code Quality Metrics",
  UI_FRAMEWORK_DETECTION: "User Interface Framework",
  DEPENDENCIES: "Dependencies",
  DATABASE_OBJECTS: "Database Objects",
  SCHEDULED_JOBS: "Scheduled Jobs",
  INSTRUCTIONS: "Instructions",
} as const;

/**
 * Type representing the valid instruction section titles.
 */
export type InstructionSectionTitle =
  (typeof INSTRUCTION_SECTION_TITLES)[keyof typeof INSTRUCTION_SECTION_TITLES];

/**
 * Builds a formatted instruction block from a title and a list of instruction parts.
 * The title is formatted with double underscores (__title__) and followed by a newline,
 * then all parts are joined with newlines.
 *
 * @param title - The title for the instruction block (must be a valid InstructionSectionTitle)
 * @param parts - Variable number of instruction parts, which can be strings or readonly string arrays
 * @returns A single formatted string with the title and joined parts
 *
 * @example
 * ```typescript
 * buildInstructionBlock(
 *   INSTRUCTION_SECTION_TITLES.BASIC_INFO,
 *   ["Extract name", "Extract kind"],
 *   "Additional instruction"
 * )
 * // Returns: "__Basic Information__\nExtract name\nExtract kind\nAdditional instruction"
 * ```
 */
export function buildInstructionBlock(
  title: InstructionSectionTitle,
  ...parts: (string | readonly string[])[]
): string {
  const flattenedParts = parts.flat();
  const formattedTitle = `__${title}__`;

  if (flattenedParts.length === 0) {
    return formattedTitle;
  }
  return `${formattedTitle}\n${flattenedParts.join("\n")}`;
}

/**
 * Creates database mechanism mapping instructions by combining the base prefix,
 * language-specific examples, and the base suffix.
 *
 * Note: Constants are defined inside the function to avoid circular dependency issues
 * with the fragment modules that import this function.
 *
 * @param examples - Array of language-specific database mechanism examples
 * @param additionalNote - Optional additional note to append (e.g., Java's JMS/JNDI note)
 * @returns A formatted string with the complete DB mechanism mapping instructions
 */
export function createDbMechanismInstructions(
  examples: readonly string[],
  additionalNote?: string,
): string {
  const BASE_DB_MECHANISM_PREFIX = `    - mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:`;
  const BASE_DB_MECHANISM_SUFFIX = `      - Otherwise, if the code does not use a database => mechanism: 'NONE'`;
  const parts = [BASE_DB_MECHANISM_PREFIX, ...examples, BASE_DB_MECHANISM_SUFFIX];
  if (additionalNote) {
    parts.push(additionalNote);
  }
  return parts.join("\n");
}

/**
 * Configuration entry for a source prompt definition.
 * Contains only the category-specific fields; presentation fields (dataBlockHeader,
 * wrapInCodeBlock) are provided by the consumer (FileSummarizerService) at instantiation time.
 * Each entry directly includes the responseSchema using sourceSummarySchema.pick(),
 * making the schemas explicit and type-safe.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType for backward compatibility.
 */
export interface SourceConfigEntry<S extends z.ZodType = z.ZodType> {
  /** Description of the content being analyzed */
  readonly contentDesc: string;
  /** Array of instruction strings for the LLM */
  readonly instructions: readonly string[];
  /** Zod schema for validating the LLM response */
  readonly responseSchema: S;
  /** Whether the schema is complex and incompatible with some LLM providers */
  readonly hasComplexSchema?: boolean;
}

/**
 * Options for creating a standard code source configuration.
 */
export interface StandardCodeConfigOptions {
  /** Whether to use module-based entity (for C) instead of class-based */
  useModuleBase?: boolean;
  /** Additional complexity metrics to include (e.g., Python's complexity metrics) */
  extraComplexityMetrics?: string;
}

/** Schema type for dependency file configurations */
export const dependencyFileSchema = sourceSummarySchema.pick({
  purpose: true,
  implementation: true,
  dependencies: true,
});

/** Schema type for scheduled job file configurations (shell scripts, batch files, JCL) */
export const scheduledJobFileSchema = sourceSummarySchema.pick({
  purpose: true,
  implementation: true,
  scheduledJobs: true,
});

/**
 * Creates the standard Basic Info instruction block used by most file types.
 * This block includes Purpose and Implementation fragments.
 *
 * @returns A formatted instruction block string with Basic Information title
 */
export function createBasicInfoBlock(): string {
  return buildInstructionBlock(
    INSTRUCTION_SECTION_TITLES.BASIC_INFO,
    SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
    SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
  );
}

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
export function createDependencyConfig(
  contentDesc: string,
  dependencyFragment: string,
): SourceConfigEntry<typeof dependencyFileSchema> {
  return {
    contentDesc,
    responseSchema: dependencyFileSchema,
    instructions: [
      createBasicInfoBlock(),
      buildInstructionBlock(INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS, dependencyFragment),
    ],
    hasComplexSchema: true,
  };
}

/**
 * Factory function to create a scheduled job source configuration.
 * This function eliminates duplication for script files (shell, batch, JCL) by generating
 * a consistent 2-block instruction pattern:
 * 1. Basic Info (purpose and implementation)
 * 2. Scheduled Jobs (with file-type-specific job detection instructions)
 *
 * @param contentDesc - Description of the content being analyzed (e.g., "the Shell script (bash/sh)")
 * @param jobFragments - The file-type-specific scheduled job extraction fragments
 * @returns A SourceConfigEntry with the standard scheduled job instruction blocks
 */
export function createScheduledJobConfig(
  contentDesc: string,
  ...jobFragments: readonly string[]
): SourceConfigEntry<typeof scheduledJobFileSchema> {
  return {
    contentDesc,
    responseSchema: scheduledJobFileSchema,
    instructions: [
      createBasicInfoBlock(),
      buildInstructionBlock(
        INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
        SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
        ...jobFragments,
      ),
    ],
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
export function createStandardCodeConfig(
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
