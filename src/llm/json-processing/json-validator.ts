import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../types/llm.types";
import { logErrorMsg } from "../../common/utils/logging";
import { JsonValidatorResult } from "./json-processing-result.types";
import { z } from "zod";

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
        const errorMessage = `Zod schema validation failed for '${resourceName}'. Validation issues: ${JSON.stringify(issues)}`;
        if (logSanitizationSteps) logErrorMsg(errorMessage);
        return { success: false, issues };
      }
    } else if (completionOptions.outputFormat === LLMOutputFormat.TEXT) {
      if (this.isLLMGeneratedContent(content)) {
        return { success: true, data: content };
      }
      logErrorMsg(
        `Content for TEXT format is not valid LLMGeneratedContent for resource: ${resourceName}`,
      );
      return { success: false, issues: this.createValidationIssue("Invalid LLMGeneratedContent") };
    } else if (this.isLLMGeneratedContent(content)) {
      return { success: true, data: content };
    } else {
      logErrorMsg(`Content is not valid LLMGeneratedContent for resource: ${resourceName}`);
      return { success: false, issues: this.createValidationIssue("Invalid LLMGeneratedContent") };
    }
  }

  /**
   * Checks if the given value is LLM-generated content.
   */
  private isLLMGeneratedContent(value: unknown): value is LLMGeneratedContent {
    if (value === null) return true;
    if (typeof value === "string") return true;
    if (Array.isArray(value)) return true;
    if (typeof value === "object" && !Array.isArray(value)) return true;
    return false;
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
