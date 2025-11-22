import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../../types/llm.types";
import { JsonValidatorResult } from "../json-processing-result.types";
import { logJsonProcessingWarning } from "../../../common/utils/logging";
import { z } from "zod";

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
 * JsonValidator handles validation of LLM response content against optional Zod schemas
 * and ensures content matches expected LLM-generated content types.
 */
export class JsonValidator {
  /**
   * Validate the LLM response content against a Zod schema if provided, returning a result object
   * that indicates success or failure with detailed context.
   */
  validate<T>(
    content: unknown, // Accept unknown values to be safely handled by Zod validation
    completionOptions: LLMCompletionOptions,
    resourceName: string,
    logSanitizationSteps = true,
  ): JsonValidatorResult<T | LLMGeneratedContent> {
    if (
      content &&
      completionOptions.outputFormat === LLMOutputFormat.JSON &&
      completionOptions.jsonSchema
    ) {
      const validation = completionOptions.jsonSchema.safeParse(content);

      if (validation.success) {
        return { success: true, data: validation.data as T };
      } else {
        const issues = validation.error.issues;
        if (logSanitizationSteps) {
          logJsonProcessingWarning(
            resourceName,
            "Schema validation failed. Validation issues:",
            issues,
          );
        }
        return { success: false, issues };
      }
    } else if (completionOptions.outputFormat === LLMOutputFormat.TEXT) {
      const validation = llmGeneratedContentSchema.safeParse(content);
      if (validation.success) {
        return { success: true, data: content as LLMGeneratedContent };
      }
      logJsonProcessingWarning(
        resourceName,
        "Content for TEXT format is not valid LLMGeneratedContent",
      );
      return { success: false, issues: this.createValidationIssue("Invalid LLMGeneratedContent") };
    } else {
      const validation = llmGeneratedContentSchema.safeParse(content);
      if (validation.success) {
        return { success: true, data: content as LLMGeneratedContent };
      }
      logJsonProcessingWarning(resourceName, "Content is not valid LLMGeneratedContent");
      return { success: false, issues: this.createValidationIssue("Invalid LLMGeneratedContent") };
    }
  }

  /**
   * Creates a generic validation issue for non-schema validation failures.
   */
  private createValidationIssue(message: string): z.ZodIssue[] {
    return [
      {
        code: z.ZodIssueCode.custom,
        path: [],
        message,
      },
    ];
  }
}
