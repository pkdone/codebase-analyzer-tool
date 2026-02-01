/**
 * Public API for JSON processing module.
 *
 * This barrel export provides a clean, unified interface for consumers of the JSON
 * processing functionality. It separates the public API (what external code should use)
 * from the internal implementation details.
 *
 * @example
 * ```typescript
 * import {
 *   parseAndValidateLLMJson,
 *   JsonProcessingError,
 *   JsonProcessingErrorType,
 *   hasSignificantRepairs,
 * } from "../json-processing";
 * ```
 */

// ============================================
// Primary Public API
// ============================================

/**
 * Main entry point for parsing and validating LLM-generated JSON string content.
 * Handles sanitization, parsing, and schema validation in a single call.
 *
 * Note: Accepts string content only. For pre-parsed JSON objects, use
 * repairAndValidateJson directly.
 */
export { parseAndValidateLLMJson } from "./core/json-processing";

/**
 * Validates and repairs pre-parsed JSON data against a Zod schema.
 * Use this when content is already a parsed object (e.g., from LLM APIs with native JSON mode)
 * rather than a string that needs parsing.
 *
 * This function implements a test-fix-test pattern:
 * 1. First attempts validation without modifications
 * 2. If validation fails, applies schema-fixing transforms
 * 3. Re-validates after repairs
 */
export { repairAndValidateJson, type ValidationWithTransformsResult } from "./core/json-validating";

// ============================================
// Error Types
// ============================================

/**
 * Error class and error type enum for JSON processing failures.
 * Use these for error handling and distinguishing between parse vs validation errors.
 */
export { JsonProcessingError, JsonProcessingErrorType } from "./types/json-processing.errors";

// ============================================
// Result Types
// ============================================

/**
 * Result type for JSON processing operations (success with data or failure with error).
 */
export type { JsonProcessorResult } from "./types/json-processing-result.types";

// ============================================
// Repair Utilities
// ============================================

/**
 * Utility for determining if repairs indicate significant JSON issues.
 * Used by LLMExecutionPipeline to track JSON mutation statistics.
 */
export { hasSignificantRepairs } from "./utils/repair-analysis";

/**
 * Constants for repair step descriptions and significance classification.
 * REPAIR_STEP provides consistent naming for all repair operations.
 * INSIGNIFICANT_REPAIR_STEPS defines which repairs are trivial (e.g., whitespace trimming).
 */
export {
  REPAIR_STEP,
  REPAIR_STEP_TEMPLATE,
  INSIGNIFICANT_REPAIR_STEPS,
} from "./constants/repair-steps.config";
