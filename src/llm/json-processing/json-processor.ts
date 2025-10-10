import { LLMGeneratedContent, LLMCompletionOptions } from "../types/llm.types";
import { logWarningMsg } from "../../common/utils/logging";
import { JsonProcessingError } from "../types/llm-errors.types";
import { JsonValidator } from "./json-validator";
import { unwrapJsonSchemaStructure } from "./utils/post-parse-transforms";
import { JsonProcessorResult } from "./json-processing-result.types";
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
} from "./sanitizers";

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
   */
  private runSanitizationPipeline<T>(
    originalContent: string,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
    logSanitizationSteps: boolean,
  ): JsonProcessorResult<T> {
    let workingContent = originalContent;
    const appliedSteps: string[] = [];
    const appliedDescriptions: string[] = [];
    let lastParseError: Error | undefined;
    const rawParseResult = this.tryParseAndValidate<T>( // try parsing the raw input first
      workingContent,
      resourceName,
      completionOptions,
      logSanitizationSteps,
    );
    if (rawParseResult.success) return { success: true, data: rawParseResult.data, steps: [] };
    if (rawParseResult.parseError) lastParseError = rawParseResult.parseError;

    // Apply each sanitizer in the pipeline, attempting to parse after each step
    for (const sanitizer of this.SANITIZATION_ORDERED_PIPELINE) {
      const { content, changed, description } = sanitizer(workingContent);

      if (changed) {
        workingContent = content;

        if (description) {
          appliedSteps.push(description);
          appliedDescriptions.push(description);
        }

        const parseResult = this.tryParseAndValidate<T>(
          workingContent,
          resourceName,
          completionOptions,
          logSanitizationSteps,
        );

        if (parseResult.success) {
          if (logSanitizationSteps && appliedSteps.length > 0) {
            logWarningMsg(
              `JSON sanitation steps for resource '${resourceName}': ${appliedSteps.join(" -> ")}`,
            );
          }

          return {
            success: true,
            data: parseResult.data,
            steps: appliedSteps,
            diagnostics:
              appliedDescriptions.length > 0 ? appliedDescriptions.join(" | ") : undefined,
          };
        }

        if (parseResult.parseError) lastParseError = parseResult.parseError;
      }
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
   * Returns a result indicating success or failure, including any parse error encountered.
   */
  private tryParseAndValidate<T>(
    content: string,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
    logValidationIssues: boolean,
  ): { success: true; data: T } | { success: false; parseError?: Error } {
    let parsed: unknown;

    try {
      parsed = JSON.parse(content);
    } catch (err) {
      return { success: false, parseError: err instanceof Error ? err : undefined };
    }

    const transformed = unwrapJsonSchemaStructure(parsed);
    const validationResult = this.jsonValidator.validate<T>(
      transformed,
      completionOptions,
      resourceName,
      logValidationIssues,
    );

    if (!validationResult.success) {
      return { success: false };
    } else {
      return { success: true, data: validationResult.data as T };
    }
  }
}
