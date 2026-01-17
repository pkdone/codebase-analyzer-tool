import { z } from "zod";
import {
  SOURCES_PROMPT_FRAGMENTS,
  COMPOSITES,
  type LanguageSpecificFragments,
} from "../sources.fragments";
import {
  INSTRUCTION_SECTION_TITLES,
  buildInstructionBlock,
  type InstructionSectionTitle,
} from "../source-instruction-utils";
import {
  sourceSummarySchema,
  commonSourceAnalysisSchema,
} from "../../../../schemas/sources.schema";
import type { PromptConfig } from "../../../../../common/prompts/prompt.types";

/**
 * Data block header for source code analysis prompts.
 */
export const CODE_DATA_BLOCK_HEADER = "CODE" as const;

/**
 * Configuration entry for a source prompt definition.
 * Extends PromptConfig which requires contentDesc, responseSchema, and instructions fields.
 * Each entry directly includes the responseSchema using sourceSummarySchema.pick(),
 * making the schemas explicit and type-safe.
 *
 * @template S - The Zod schema type for validating the LLM response. Defaults to z.ZodType for backward compatibility.
 */
export type SourceConfigEntry<S extends z.ZodType = z.ZodType> = PromptConfig<S>;

/**
 * Valid field names that can be picked from sourceSummarySchema.
 * This type ensures compile-time safety when specifying schema fields.
 * We use keyof shape to get the actual schema keys, not the inferred type keys.
 */
export type SourceSummaryField = keyof typeof sourceSummarySchema.shape;

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
    dataBlockHeader: CODE_DATA_BLOCK_HEADER,
    wrapInCodeBlock: true,
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
    dataBlockHeader: CODE_DATA_BLOCK_HEADER,
    wrapInCodeBlock: true,
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
export function createSimpleConfig(
  contentDesc: string,
  schemaFields: readonly SourceSummaryField[],
  instructionBlocks: readonly {
    title: InstructionSectionTitle;
    fragments: readonly (string | readonly string[])[];
  }[],
): SourceConfigEntry {
  // Build the pick mask dynamically from the field names
  // Type assertion is required because Zod's pick() uses `Exactly<>` which requires
  // compile-time known keys, but we're building them dynamically at runtime.
  // The SourceSummaryField type ensures we only accept valid field names.
  const pickMask = Object.fromEntries(
    schemaFields.map((field) => [field, true] as const),
  ) as Partial<Record<SourceSummaryField, true>>;

  const instructions = instructionBlocks.map((block) => {
    // If this is the first block and it's BASIC_INFO with standard fragments, use the helper
    if (
      block.title === INSTRUCTION_SECTION_TITLES.BASIC_INFO &&
      block.fragments.length === 2 &&
      block.fragments[0] === SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE &&
      block.fragments[1] === SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION
    ) {
      return createBasicInfoBlock();
    }
    return buildInstructionBlock(block.title, ...block.fragments);
  }) as readonly string[];

  return {
    contentDesc,
    // Type assertion needed because Zod's pick() signature uses Exactly<> which
    // requires compile-time knowledge of the mask, but we build it at runtime.
    // Runtime safety is ensured by SourceSummaryField constraining valid keys.
    responseSchema: sourceSummarySchema.pick(
      pickMask as Parameters<typeof sourceSummarySchema.pick>[0],
    ),
    instructions,
    dataBlockHeader: CODE_DATA_BLOCK_HEADER,
    wrapInCodeBlock: true,
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
    dataBlockHeader: CODE_DATA_BLOCK_HEADER,
    wrapInCodeBlock: true,
  };
}
