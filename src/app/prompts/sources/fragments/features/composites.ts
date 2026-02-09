/**
 * Pre-composed instruction sets for common patterns across file types.
 * These combine related fragments for convenience and consistency.
 *
 * @example
 * ```typescript
 * // Use in instruction blocks for better clarity
 * buildInstructionBlock(
 *   INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
 *   COMPOSITES.CODE_QUALITY,
 * )
 * ```
 */
import { INTEGRATION_POINTS_FRAGMENTS, SCHEDULED_JOBS_FRAGMENTS } from "./common.fragments";
import { CODE_QUALITY_FRAGMENTS } from "./code-quality.fragments";
import { DB_INTEGRATION_FRAGMENTS } from "./database.fragments";

/**
 * Composable instruction sets for common patterns across file types.
 * These pre-composed instruction blocks combine related fragments for convenience and consistency.
 */
export const COMPOSITES = {
  /** Pre-composed code quality analysis instructions including metrics and code smells */
  CODE_QUALITY: [
    CODE_QUALITY_FRAGMENTS.INTRO,
    CODE_QUALITY_FRAGMENTS.FUNCTION_METRICS,
    CODE_QUALITY_FRAGMENTS.FUNCTION_SMELLS,
    CODE_QUALITY_FRAGMENTS.FILE_METRICS,
  ] as const,

  /** Pre-composed database integration analysis instructions */
  DB_INTEGRATION: [
    DB_INTEGRATION_FRAGMENTS.INTRO,
    DB_INTEGRATION_FRAGMENTS.REQUIRED_FIELDS,
  ] as const,

  /** Pre-composed integration points instructions */
  INTEGRATION_POINTS: [INTEGRATION_POINTS_FRAGMENTS.INTRO] as const,

  /** Pre-composed scheduled jobs instructions */
  SCHEDULED_JOBS: [SCHEDULED_JOBS_FRAGMENTS.INTRO, SCHEDULED_JOBS_FRAGMENTS.FIELDS] as const,
} as const;
