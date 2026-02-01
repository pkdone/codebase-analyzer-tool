import { z } from "zod";
import {
  COMMON_FRAGMENTS,
  BASE_FRAGMENTS,
  SCHEDULED_JOBS_FRAGMENTS,
  INTEGRATION_POINTS_FRAGMENTS,
  COMPOSITES,
} from "../fragments";
import type { LanguageSpecificFragments } from "../sources.types";
import { sourceSummarySchema, commonSourceAnalysisSchema } from "../../../schemas/source-file.schema";
import { INSTRUCTION_SECTION_TITLES, buildInstructionBlock } from "../utils";
import type { BasePromptConfigEntry } from "../../prompts.types";

/**
 * Configuration entry for a source prompt definition.
 * Extends BasePromptConfigEntry for source file analysis.
 *
 * Contains only the category-specific fields; presentation fields (dataBlockHeader,
 * wrapInCodeBlock) are provided by the consumer (buildSourcePrompt) at instantiation time.
 * Each entry directly includes the responseSchema using sourceSummarySchema.pick(),
 * making the schemas explicit and type-safe.
 *
 * The hasComplexSchema field is inherited from BasePromptConfigEntry and indicates
 * whether the schema is incompatible with some LLM providers' strict JSON mode.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType<unknown>
 *               for type-safe handling and to allow use as a constraint for heterogeneous
 *               collections where entries have different specific schema types.
 */
export type SourceConfigEntry<S extends z.ZodType<unknown> = z.ZodType<unknown>> =
  BasePromptConfigEntry<S>;

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
    COMMON_FRAGMENTS.PURPOSE,
    COMMON_FRAGMENTS.IMPLEMENTATION,
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
        SCHEDULED_JOBS_FRAGMENTS.INTRO,
        SCHEDULED_JOBS_FRAGMENTS.FIELDS,
        ...jobFragments,
      ),
    ],
  };
}

/**
 * Factory function to create a composite source configuration.
 * This function is used for special file types (SQL, Markdown, XML, JSP, etc.) that
 * don't fit the standard code or dependency patterns but need specific instruction blocks.
 *
 * @param contentDesc - Description of the content being analyzed
 * @param responseSchema - The Zod schema for validation
 * @param instructions - Array of pre-formatted instruction blocks
 * @param hasComplexSchema - Whether the schema requires complex handling (default: false)
 * @returns A SourceConfigEntry with the provided configuration
 */
export function createCompositeSourceConfig<S extends z.ZodType<unknown>>(
  contentDesc: string,
  responseSchema: S,
  instructions: readonly string[],
  hasComplexSchema = false,
): SourceConfigEntry<S> {
  return {
    contentDesc,
    responseSchema,
    instructions,
    hasComplexSchema,
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
    useModuleBase ? BASE_FRAGMENTS.MODULE : BASE_FRAGMENTS.CLASS,
    COMMON_FRAGMENTS.PURPOSE,
    COMMON_FRAGMENTS.IMPLEMENTATION,
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
        INTEGRATION_POINTS_FRAGMENTS.INTRO,
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
