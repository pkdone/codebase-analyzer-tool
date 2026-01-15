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
 * Type to define the pattern definition for the error messages
 */
export interface LLMErrorMsgRegExPattern {
  readonly pattern: RegExp;
  readonly units: string;
  readonly isMaxFirst: boolean;
}
