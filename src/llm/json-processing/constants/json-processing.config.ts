/**
 * Centralized configuration for JSON processing.
 * Consolidates all constants, delimiters, and configuration values used across the JSON processing module.
 */

/**
 * Centralized delimiter and structural character constants used across JSON sanitization.
 * Having these in one place eliminates magic strings and makes future enhancements
 * (e.g., adding support for single quotes in relaxed modes) easier.
 */
export const DELIMITERS = Object.freeze({
  OPEN_BRACE: "{",
  CLOSE_BRACE: "}",
  OPEN_BRACKET: "[",
  CLOSE_BRACKET: "]",
  DOUBLE_QUOTE: '"',
  BACKSLASH: "\\",
  COMMA: ",",
  COLON: ":",
  SPACE: " ",
  TAB: "\t",
  NEWLINE: "\n",
  CARRIAGE_RETURN: "\r",
});

export type DelimiterKey = keyof typeof DELIMITERS;

/**
 * JSON keywords for validation and processing.
 */
export const JSON_KEYWORDS = Object.freeze(["true", "false", "null"] as const);

/**
 * Code fence markers used by LLMs to wrap JSON responses.
 * These constants centralize the magic strings used for detecting and removing code fences.
 */
export const CODE_FENCE_MARKERS = Object.freeze({
  /**
   * Generic code fence marker (three backticks)
   */
  GENERIC: "```",
  /**
   * JSON code fence marker
   */
  JSON: "```json",
  /**
   * JavaScript code fence marker
   */
  JAVASCRIPT: "```javascript",
  /**
   * TypeScript code fence marker
   */
  TYPESCRIPT: "```ts",
} as const);

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
