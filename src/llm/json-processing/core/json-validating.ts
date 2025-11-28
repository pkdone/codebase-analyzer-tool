import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../../types/llm.types";
import { logSingleLineWarning } from "../../../common/utils/logging";
import { z } from "zod";

/**
 * Result type for JSON validation operations.
 * Uses a discriminated union to distinguish between success and validation failures.
 */
export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; issues: z.ZodIssue[] };

/**
 * Zod schema for validating LLM-generated content types.
 * LLM-generated content can be a string, object, array, or null.
 */
const llmGeneratedContentSchema = z.union([
  z.string(),
  z.record(z.unknown()),
  z.array(z.unknown()),
  z.null(),
]);

/**
 * Creates a generic validation issue for non-schema validation failures.
 */
function createValidationIssue(message: string): z.ZodIssue[] {
  return [
    {
      code: z.ZodIssueCode.custom,
      path: [],
      message,
    },
  ];
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
  if (
    data &&
    completionOptions.outputFormat === LLMOutputFormat.JSON &&
    completionOptions.jsonSchema
  ) {
    const validation = completionOptions.jsonSchema.safeParse(data);

    if (validation.success) {
      return { success: true, data: validation.data as T };
    } else {
      const issues = validation.error.issues;
      if (loggingEnabled) {
        logSingleLineWarning("Schema validation failed. Validation issues:", issues);
      }
      return { success: false, issues };
    }
  } else if (completionOptions.outputFormat === LLMOutputFormat.TEXT) {
    const validation = llmGeneratedContentSchema.safeParse(data);
    if (validation.success) return { success: true, data: data as LLMGeneratedContent as T };
    if (loggingEnabled) {
      logSingleLineWarning("Content for TEXT format is not valid LLMGeneratedContent");
    }
    return { success: false, issues: createValidationIssue("Invalid LLMGeneratedContent") };
  } else {
    const validation = llmGeneratedContentSchema.safeParse(data);
    if (validation.success) return { success: true, data: data as LLMGeneratedContent as T };
    if (loggingEnabled) {
      logSingleLineWarning("Content is not valid LLMGeneratedContent");
    }
    return { success: false, issues: createValidationIssue("Invalid LLMGeneratedContent") };
  }
}
