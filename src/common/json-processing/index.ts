/**
 * JSON Processing module - Public API
 *
 * This module provides a robust JSON processing system for handling potentially
 * malformed JSON responses from LLMs. It includes sanitization, validation,
 * and transformation capabilities.
 *
 * This re-exports the public API from the implementation in common/llm/json-processing,
 * providing a cleaner import path for consumers outside the LLM module.
 *
 * @example
 * ```typescript
 * import { processJson, JsonProcessingError, JsonProcessorResult } from "../../common/json-processing";
 * ```
 */

// Core processing function
export { processJson } from "../llm/json-processing/core/json-processing";

// Error types
export {
  JsonProcessingError,
  JsonProcessingErrorType,
} from "../llm/json-processing/types/json-processing.errors";

// Result types
export type { JsonProcessorResult } from "../llm/json-processing/types/json-processing-result.types";

// Sanitizer utilities (for reporting/diagnostics)
export { hasSignificantSanitizationSteps } from "../llm/json-processing/sanitizers";

// Schema metadata utilities
export { extractSchemaMetadata } from "../llm/json-processing/utils/zod-schema-metadata";
