import { LLMGeneratedContent, LLMCompletionOptions, LLMOutputFormat } from "../types/llm.types";
import { logErrorMsg } from "../../common/utils/logging";

/**
 * Validate the LLM response content against a Zod schema if provided returning null if validation
 * fails (having logged the error).
 */
export function applyOptionalSchemaValidationToContent<T>(
  content: unknown, // Accept unknown values to be safely handled by Zod validation
  completionOptions: LLMCompletionOptions,
  resourceName: string,
  logSanitizationSteps = true,
  onValidationIssues?: (issues: unknown) => void,
): T | LLMGeneratedContent | null {
  if (
    content &&
    completionOptions.outputFormat === LLMOutputFormat.JSON &&
    completionOptions.jsonSchema
  ) {
    const validation = completionOptions.jsonSchema.safeParse(content);

    if (validation.success) {
      return validation.data as T;
    } else {
      const issues = validation.error.issues;
      if (onValidationIssues) onValidationIssues(issues);
      const errorMessage = `Zod schema validation failed for '${resourceName}' so returning null. Validation issues: ${JSON.stringify(issues)}`;
      if (logSanitizationSteps) logErrorMsg(errorMessage);
      return null;
    }
  } else if (completionOptions.outputFormat === LLMOutputFormat.TEXT) {
    if (isLLMGeneratedContent(content)) {
      return content;
    }
    logErrorMsg(
      `Content for TEXT format is not valid LLMGeneratedContent for resource: ${resourceName}`,
    );
    return null;
  } else if (isLLMGeneratedContent(content)) {
    return content;
  } else {
    logErrorMsg(`Content is not valid LLMGeneratedContent for resource: ${resourceName}`);
    return null;
  }
}

/**
 * Checks if the given value is LLM-generated content.
 */
export function isLLMGeneratedContent(value: unknown): value is LLMGeneratedContent {
  if (value === null) return true;
  if (typeof value === "string") return true;
  if (Array.isArray(value)) return true;
  if (typeof value === "object" && !Array.isArray(value)) return true;
  return false;
}
