import { JsonProcessingError } from "./json-processing.errors";
import { z } from "zod";

/**
 * Result type for JsonValidator operations. This discriminated union allows callers
 * to handle validation success and failure cases without relying on thrown exceptions
 * or callback patterns.
 */
export type JsonValidatorResult<T> =
  | { success: true; data: T }
  | { success: false; issues: z.ZodIssue[] };

/**
 * Result type for JsonProcessor operations. This discriminated union provides rich
 * context about parsing success or failure, including any sanitization steps that
 * were applied during the process.
 */
export type JsonProcessorResult<T> =
  | { success: true; data: T; steps: readonly string[]; diagnostics?: string }
  | { success: false; error: JsonProcessingError };
