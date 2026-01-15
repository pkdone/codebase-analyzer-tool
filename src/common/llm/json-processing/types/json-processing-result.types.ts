import { JsonProcessingError } from "./json-processing.errors";

/**
 * Result type for JsonProcessor operations. This discriminated union provides rich
 * context about parsing success or failure, including any repairs that
 * were applied during the process.
 *
 * @property repairs - Individual repair operations applied to fix JSON issues.
 *   Used for determining significance of changes. Contains entries from
 *   REPAIR_STEP constants (e.g., "Removed code fences", "coerceStringToArray").
 * @property pipelineSteps - High-level pipeline step descriptions (which sanitizers/phases ran).
 *   Used for logging context about what processing occurred (e.g., "Fixed JSON structure and noise").
 */
export type JsonProcessorResult<T> =
  | {
      success: true;
      data: T;
      repairs: readonly string[];
      pipelineSteps: readonly string[];
    }
  | { success: false; error: JsonProcessingError };
