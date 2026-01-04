/**
 * Shared application-wide constants.
 * Contains placeholder values and common strings used across multiple modules.
 */

/**
 * Placeholder value for unknown or missing data.
 * Use this instead of hardcoded "unknown" strings to ensure consistency
 * across the application when reporting missing values.
 */
export const UNKNOWN_VALUE_PLACEHOLDER = "unknown";

/**
 * Placeholder value for not available or missing data in reports.
 * Use this instead of hardcoded "N/A" strings to ensure consistency
 * across the application when reporting unavailable values.
 */
export const NOT_AVAILABLE_PLACEHOLDER = "N/A";

/**
 * Default complexity level for database objects when complexity cannot be determined.
 * Used as a fallback when the LLM returns invalid or unrecognized complexity values.
 */
export const DEFAULT_COMPLEXITY = "LOW";
