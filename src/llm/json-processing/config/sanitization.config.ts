/**
 * Centralized configuration for JSON sanitization behavior.
 * Consolidates all magic numbers and thresholds used across sanitizers.
 */

/**
 * Configuration for concatenation chain sanitization.
 * Controls how JavaScript/Java-style string concatenation is handled.
 */
export const concatenationConfig = Object.freeze({
  /**
   * Maximum iterations for the light (fast) concatenation collapse algorithm.
   * Prevents infinite loops in case of complex or malformed chains.
   */
  LIGHT_COLLAPSE_MAX_ITERATIONS: 50,

  /**
   * Maximum iterations for the full (thorough) normalization algorithm.
   * Higher limit allows more complex chains to be fully processed.
   */
  FULL_NORMALIZE_MAX_ITERATIONS: 80,

  /**
   * Maximum number of string literals to merge in a light collapse.
   * Limits the complexity of literal-only chains that are merged.
   */
  LIGHT_COLLAPSE_LITERAL_CHAIN_LIMIT: 6,

  /**
   * Maximum number of string literals to merge in full normalization.
   * Higher limit for more thorough processing.
   */
  FULL_NORMALIZE_LITERAL_CHAIN_LIMIT: 10,

  /**
   * Maximum number of consecutive literals before an identifier in chains.
   * Used to limit complexity when collapsing mixed chains.
   */
  MIXED_CHAIN_LITERAL_LIMIT: 12,

  /**
   * Maximum number of literals in complex mixed chains.
   * Used for chains with multiple literals before identifiers.
   */
  COMPLEX_CHAIN_LITERAL_LIMIT: 20,
});

/**
 * General JSON processing limits and safety thresholds.
 */
export const processingConfig = Object.freeze({
  /**
   * Buffer size when truncating content for safety.
   * Ensures we don't cut off content too aggressively.
   */
  TRUNCATION_SAFETY_BUFFER: 100,

  /**
   * Maximum depth for recursive JSON structure processing.
   * Prevents stack overflow from deeply nested structures.
   */
  MAX_RECURSION_DEPTH: 4,
});

/**
 * Combined sanitization configuration.
 * Export this for convenient access to all config values.
 */
export const sanitizationConfig = Object.freeze({
  concatenation: concatenationConfig,
  processing: processingConfig,
});
