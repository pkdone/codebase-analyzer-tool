import { JsonProcessingError } from "./json-processing.errors";

/**
 * Result type for JsonProcessor operations. This discriminated union provides rich
 * context about parsing success or failure, including any sanitization steps that
 * were applied during the process.
 */
export type JsonProcessorResult<T> =
  | { success: true; data: T; mutationSteps: readonly string[] }
  | { success: false; error: JsonProcessingError };
