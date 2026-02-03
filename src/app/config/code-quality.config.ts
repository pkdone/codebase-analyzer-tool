/**
 * Configuration for code quality analysis thresholds.
 * Contains constants used in repository aggregation pipelines to categorize
 * function complexity and identify code quality issues.
 */

/**
 * Code quality configuration interface for type validation.
 * Ensures the configuration conforms to the expected structure at compile time.
 */
interface CodeQualityConfig {
  /** Threshold above which a function is considered "high complexity" */
  readonly HIGH_COMPLEXITY_THRESHOLD: number;
  /** Threshold above which a function is considered "very high complexity" */
  readonly VERY_HIGH_COMPLEXITY_THRESHOLD: number;
  /** Threshold above which a function is considered "long" (lines of code) */
  readonly LONG_FUNCTION_THRESHOLD: number;
}

export const codeQualityConfig = {
  /**
   * Functions with cyclomatic complexity above this threshold are flagged as high complexity.
   * Standard industry guideline: 10 is a common threshold for "complex" code.
   */
  HIGH_COMPLEXITY_THRESHOLD: 10,

  /**
   * Functions with cyclomatic complexity above this threshold are flagged as very high complexity.
   * Functions exceeding this are typically candidates for refactoring.
   */
  VERY_HIGH_COMPLEXITY_THRESHOLD: 20,

  /**
   * Functions with more lines of code than this threshold are flagged as "long".
   * Long functions are often harder to maintain and test.
   */
  LONG_FUNCTION_THRESHOLD: 50,
} as const satisfies CodeQualityConfig;

/**
 * Type alias for the codeQualityConfig value type.
 * Used for dependency injection to avoid circular type references.
 */
export type CodeQualityConfigType = typeof codeQualityConfig;
