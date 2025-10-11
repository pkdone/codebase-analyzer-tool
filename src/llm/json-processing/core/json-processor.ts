import { LLMGeneratedContent, LLMCompletionOptions } from "../../types/llm.types";
import { JsonProcessingError } from "../../types/llm-errors.types";
import { JsonValidator } from "./json-validator";
import { unwrapJsonSchemaStructure } from "../utils/post-parse-transforms";
import { JsonProcessingLogger } from "./json-processing-logger";
import { JsonProcessorResult } from "../json-processing-result.types";
import {
  trimWhitespace,
  removeCodeFences,
  removeControlChars,
  extractLargestJsonSpan,
  unwrapJsonSchema,
  collapseDuplicateJsonObject,
  fixMismatchedDelimiters,
  addMissingPropertyCommas,
  removeTrailingCommas,
  concatenationChainSanitizer,
  overEscapedSequencesSanitizer,
  completeTruncatedStructures,
  type Sanitizer,
} from "../sanitizers";

/**
 * Types of errors that can occur during JSON parsing and validation.
 */
type ParseErrorType = "parse";
type ValidationErrorType = "validation";

/**
 * Result type for parsing and validation attempts.
 * Uses a discriminated union to distinguish between success, parse errors, and validation errors.
 */
type ParseAndValidateResult<T> =
  | { success: true; data: T }
  | { success: false; errorType: ParseErrorType; error: Error }
  | { success: false; errorType: ValidationErrorType; error: Error };

/**
 * JsonProcessor encapsulates the logic for parsing and validating JSON content from LLM responses.
 * It uses a unified declarative sanitization pipeline that applies sanitizers progressively,
 * attempting to parse after each step.
 */
export class JsonProcessor {
  private readonly jsonValidator = new JsonValidator();
  // The unified, ordered pipeline of sanitizers, this pipeline starts with basic sanitizers
  private readonly SANITIZATION_ORDERED_PIPELINE = [
    trimWhitespace,
    removeCodeFences,
    removeControlChars,
    extractLargestJsonSpan,
    unwrapJsonSchema,
    collapseDuplicateJsonObject,
    fixMismatchedDelimiters,
    addMissingPropertyCommas,
    removeTrailingCommas,
    concatenationChainSanitizer,
    overEscapedSequencesSanitizer,
    completeTruncatedStructures,
  ] as const satisfies readonly Sanitizer[];

  /**
   * Convert text content to JSON, trimming the content to only include the JSON part and optionally
   * validate it against a Zod schema. Returns a result object indicating success or failure.
   */
  parseAndValidate<T = Record<string, unknown>>(
    content: LLMGeneratedContent,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
    logSanitizationSteps = true,
  ): JsonProcessorResult<T> {
    if (typeof content !== "string") {
      const contentText = JSON.stringify(content);
      const error = new JsonProcessingError(
        `LLM response for resource '${resourceName}' is not a string`,
        contentText,
        contentText,
        [],
      );
      return { success: false, error };
    }

    return this.runSanitizationPipeline<T>(
      content,
      resourceName,
      completionOptions,
      logSanitizationSteps,
    );
  }

  /**
   * Runs the unified sanitization pipeline, attempting to parse after each step.
   * Returns success with the parsed and validated data as soon as parsing succeeds,
   * or returns failure if all sanitizers are exhausted without success.
   * Stops immediately if validation fails (as opposed to parse failures), since
   * sanitizers cannot fix schema validation issues.
   */
  private runSanitizationPipeline<T>(
    originalContent: string,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
    logSanitizationSteps: boolean,
  ): JsonProcessorResult<T> {
    const logger = new JsonProcessingLogger(resourceName);
    let workingContent = originalContent;
    const appliedSteps: string[] = [];
    const appliedDescriptions: string[] = [];
    let lastParseError: Error | undefined;
    // Create a unified pipeline: null represents "try raw input first", followed by sanitizers
    const unifiedPipeline: (Sanitizer | null)[] = [null, ...this.SANITIZATION_ORDERED_PIPELINE];

    for (const sanitizer of unifiedPipeline) {
      // Apply sanitizer if present
      // Null means skip sanitization, ie. for first iteration when want to parse just the raw input
      if (sanitizer !== null) {
        const { content, changed, description } = sanitizer(workingContent);
        if (!changed) continue; // Skip if sanitizer didn't change anything
        workingContent = content;

        if (description) {
          appliedSteps.push(description);
          appliedDescriptions.push(description);
        }
      }

      // Try parsing and validating after sanitization (or with raw input on first iteration)
      const parseResult = this.tryParseAndValidate<T>(
        workingContent,
        resourceName,
        completionOptions,
        logSanitizationSteps,
      );

      // Success - return the data
      if (parseResult.success) {
        if (logSanitizationSteps && appliedSteps.length > 0) {
          logger.logSanitizationSummary(appliedSteps);
        }

        return {
          success: true,
          data: parseResult.data,
          steps: appliedSteps,
          diagnostics: appliedDescriptions.length > 0 ? appliedDescriptions.join(" | ") : undefined,
        };
      }

      // Validation error - stop immediately (sanitizers can't fix schema issues)
      if (parseResult.errorType === "validation") {
        const error = new JsonProcessingError(
          appliedSteps.length === 0
            ? `LLM response for resource '${resourceName}' parsed successfully but failed schema validation`
            : `LLM response for resource '${resourceName}' parsed successfully but failed schema validation after sanitization`,
          originalContent,
          workingContent,
          appliedSteps,
          parseResult.error,
        );
        return { success: false, error };
      }

      // Parse error - continue to next sanitizer
      lastParseError = parseResult.error;
    }

    // All sanitizers exhausted without success - return comprehensive error
    const error = new JsonProcessingError(
      `LLM response for resource '${resourceName}' cannot be parsed to JSON after all sanitization attempts`,
      originalContent,
      workingContent,
      appliedSteps,
      lastParseError,
    );
    return { success: false, error };
  }

  /**
   * Attempts to parse the given content as JSON and validate it against the schema.
   * Returns a result indicating success or failure, distinguishing between parse errors
   * (JSON syntax issues) and validation errors (valid JSON that doesn't match schema).
   */
  private tryParseAndValidate<T>(
    content: string,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
    logValidationIssues: boolean,
  ): ParseAndValidateResult<T> {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch (err) {
      const parseErrorType: ParseErrorType = "parse";
      return {
        success: false,
        errorType: parseErrorType,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }

    const transformed = unwrapJsonSchemaStructure(parsed);
    const validationResult = this.jsonValidator.validate<T>(
      transformed,
      completionOptions,
      resourceName,
      logValidationIssues,
    );

    if (!validationResult.success) {
      const validationError = new Error(
        `Schema validation failed: ${JSON.stringify(validationResult.issues)}`,
      );
      const validationErrorType: ValidationErrorType = "validation";
      return { success: false, errorType: validationErrorType, error: validationError };
    } else {
      return { success: true, data: validationResult.data as T };
    }
  }
}
