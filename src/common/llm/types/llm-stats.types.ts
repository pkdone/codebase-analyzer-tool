/**
 * LLM statistics and error pattern types.
 */

/**
 * Type definitions for a particular status
 */
export interface LLMStatsCategoryStatus {
  readonly description: string;
  readonly symbol: string;
  count: number;
}

/**
 * Base interface for LLM statistics categories (excluding computed fields)
 */
export interface LLMStatsCategoriesBase {
  readonly SUCCESS: LLMStatsCategoryStatus;
  readonly FAILURE: LLMStatsCategoryStatus;
  readonly SWITCH: LLMStatsCategoryStatus;
  readonly OVERLOAD_RETRY: LLMStatsCategoryStatus;
  readonly HOPEFUL_RETRY: LLMStatsCategoryStatus;
  readonly CROP: LLMStatsCategoryStatus;
  readonly JSON_MUTATED: LLMStatsCategoryStatus;
}

/**
 * Type to define the status types summary including computed fields
 */
export interface LLMStatsCategoriesSummary extends LLMStatsCategoriesBase {
  readonly TOTAL?: LLMStatsCategoryStatus;
}

/**
 * Named capture groups extracted from error message regex patterns.
 * All groups are optional - the parser handles missing values with fallbacks.
 */
export interface TokenErrorGroups {
  /** Maximum tokens allowed (e.g., model's context limit) */
  readonly max?: string;
  /** Number of prompt/input tokens used */
  readonly prompt?: string;
  /** Number of completion/output tokens requested */
  readonly completion?: string;
  /** Character limit (for char-based patterns) */
  readonly charLimit?: string;
  /** Characters used in prompt (for char-based patterns) */
  readonly charPrompt?: string;
}

/**
 * Type to define the pattern definition for the error messages.
 * Uses named capture groups for readable, maintainable regex matching.
 */
export interface LLMErrorMsgRegExPattern {
  /** RegExp with named capture groups matching TokenErrorGroups */
  readonly pattern: RegExp;
  /** Unit type for the extracted values */
  readonly units: "tokens" | "chars";
}
