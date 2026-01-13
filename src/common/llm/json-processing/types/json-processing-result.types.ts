import { JsonProcessingError } from "./json-processing.errors";

/**
 * Result type for JsonProcessor operations. This discriminated union provides rich
 * context about parsing success or failure, including any sanitization steps that
 * were applied during the process.
 *
 * @property mutationSteps - Low-level mutation steps (individual fixes applied).
 *   Used for determining significance of changes. Contains entries from
 *   MUTATION_STEP constants (e.g., "Removed code fences", "coerceStringToArray").
 * @property appliedSanitizers - High-level sanitizer descriptions (which sanitizers ran).
 *   Used for logging context about what processing occurred (e.g., "Fixed JSON structure and noise").
 */
export type JsonProcessorResult<T> =
  | {
      success: true;
      data: T;
      mutationSteps: readonly string[];
      appliedSanitizers: readonly string[];
    }
  | { success: false; error: JsonProcessingError };
