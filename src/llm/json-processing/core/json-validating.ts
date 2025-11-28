import { LLMCompletionOptions, LLMOutputFormat } from "../../types/llm.types";
import { logOneLineWarning } from "../../../common/utils/logging";
import { z } from "zod";

/**
 * Result type for JSON validation operations.
 * Uses a discriminated union to distinguish between success and validation failures.
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; issues: z.ZodIssue[] };

/**
 * Creates a validation failure result with a custom error message.
 */
function createValidationFailure<T>(message: string): ValidationResult<T> {
  return {
    success: false,
    issues: [
      {
        code: z.ZodIssueCode.custom,
        path: [],
        message,
      },
    ],
  };
}

/**
 * Validates parsed data against a Zod schema if provided, or validates it as LLM-generated content.
 * Returns a result object that indicates success or failure with detailed context.
 *
 * @param data - The parsed data to validate
 * @param completionOptions - Options containing output format and optional JSON schema
 * @param loggingEnabled - Whether to enable validation error logging. Defaults to true.
 * @returns A ValidationResult indicating success with validated data, or failure with validation issues
 */
export function validateJson<T>(
  data: unknown,
  completionOptions: LLMCompletionOptions,
  loggingEnabled = true,
): ValidationResult<T> {
  if (!data) {
    return createValidationFailure<T>("Data is required for validation and cannot be empty");
  }

  if (
    (typeof data === "object" && !Array.isArray(data) && Object.keys(data).length === 0) ||
    (Array.isArray(data) && data.length === 0)
  ) {
    return createValidationFailure<T>("Data is required for validation and cannot be empty");
  }

  if (completionOptions.outputFormat !== LLMOutputFormat.JSON) {
    return createValidationFailure<T>("Output format must be JSON for schema validation");
  }

  if (!completionOptions.jsonSchema) {
    return createValidationFailure<T>("JSON schema is required for validation");
  }

  // Main validation: safeParse with the schema
  const validation = completionOptions.jsonSchema.safeParse(data);

  if (validation.success) {
    return { success: true, data: validation.data as T };
  } else {
    const issues = validation.error.issues;
    if (loggingEnabled) logOneLineWarning("Schema validation failed. Validation issues:", issues);
    return { success: false, issues };
  }
}
