import { LLMGeneratedContent, LLMCompletionOptions } from "../../types/llm.types";
import { JsonProcessingError, JsonProcessingErrorType } from "../../types/llm-errors.types";
import { JsonValidator } from "./json-validator";
import { unwrapJsonSchemaStructure, convertNullToUndefined } from "../utils/post-parse-transforms";
import { JsonProcessingLogger } from "./json-processing-logger";
import { JsonProcessorResult } from "../json-processing-result.types";
import {
  trimWhitespace,
  removeCodeFences,
  removeControlChars,
  removeStrayLinePrefixChars,
  extractLargestJsonSpan,
  collapseDuplicateJsonObject,
  fixMismatchedDelimiters,
  addMissingPropertyCommas,
  removeTrailingCommas,
  concatenationChainSanitizer,
  overEscapedSequencesSanitizer,
  completeTruncatedStructures,
  fixTruncatedPropertyNames,
  fixUndefinedValues,
  fixUnquotedPropertyNames,
  hasSignificantSanitizationSteps,
  type Sanitizer,
  type PostParseTransform,
} from "../sanitizers";

/**
 * Result type for parsing and validation attempts.
 * Uses a discriminated union to distinguish between success, parse errors, and validation errors.
 */
type ParseAndValidateResult<T> =
  | { success: true; data: T }
  | { success: false; errorType: JsonProcessingErrorType.PARSE; error: Error }
  | { success: false; errorType: JsonProcessingErrorType.VALIDATION; error: Error };

/**
 * JsonProcessor encapsulates the logic for parsing and validating JSON content from LLM responses.
 * It uses a unified declarative sanitization pipeline that applies sanitizers progressively,
 * attempting to parse after each step.
 */
export class JsonProcessor {
  private readonly jsonValidator = new JsonValidator();
  private readonly loggingEnabled: boolean;

  /**
   * Unified, ordered pipeline of sanitizers.
   *
   * The order is critical for effective JSON repair:
   *
   * 1. trimWhitespace - Remove leading/trailing whitespace to simplify subsequent regex matching
   * 2. removeCodeFences - Strip markdown code fences (```json) before attempting to find JSON span
   * 3. removeControlChars - Remove control characters that would break JSON parsing
   * 4. removeStrayLinePrefixChars - Remove stray characters at the start of lines within JSON
   * 5. extractLargestJsonSpan - Isolate the main JSON structure from surrounding text
   * 6. collapseDuplicateJsonObject - Fix cases where LLMs repeat the entire JSON object
   * 7. fixMismatchedDelimiters - Correct bracket/brace mismatches
   * 8. addMissingPropertyCommas - Insert missing commas between object properties
   * 9. removeTrailingCommas - Remove invalid trailing commas
   * 10. concatenationChainSanitizer - Fix string concatenation expressions (e.g., "BASE + '/path'")
   * 11. overEscapedSequencesSanitizer - Fix over-escaped characters (e.g., \\\\\')
   * 12. completeTruncatedStructures - Close any unclosed brackets/braces from truncated responses
   * 13. fixTruncatedPropertyNames - Fix truncated or malformed property names
   * 14. fixUndefinedValues - Convert undefined values to null (before fixUnquotedPropertyNames)
   * 15. fixUnquotedPropertyNames - Add quotes around unquoted property names
   *
   * Note: JSON Schema unwrapping is handled in POST_PARSE_TRANSFORMS after successful parsing,
   * which is more efficient than attempting to parse during sanitization.
   *
   * Each sanitizer only runs if it makes changes. Parsing is attempted after each step,
   * so earlier sanitizers have priority in fixing issues.
   */
  private readonly SANITIZATION_ORDERED_PIPELINE = [
    trimWhitespace,
    removeCodeFences,
    removeControlChars,
    removeStrayLinePrefixChars,
    extractLargestJsonSpan,
    collapseDuplicateJsonObject,
    fixMismatchedDelimiters,
    addMissingPropertyCommas,
    removeTrailingCommas,
    concatenationChainSanitizer,
    overEscapedSequencesSanitizer,
    completeTruncatedStructures,
    fixTruncatedPropertyNames,
    fixUndefinedValues,
    fixUnquotedPropertyNames,
  ] as const satisfies readonly Sanitizer[];

  /**
   * Post-parse transformations applied after successful JSON.parse but before validation.
   * These operate on the parsed object structure rather than raw strings.
   *
   * Currently contains:
   * - convertNullToUndefined: Converts null to undefined for optional fields (applied first)
   * - unwrapJsonSchemaStructure: Unwraps when LLM returns JSON Schema instead of data
   */
  private readonly POST_PARSE_TRANSFORMS: readonly PostParseTransform[] = [
    convertNullToUndefined,
    unwrapJsonSchemaStructure,
  ] as const;

  /**
   * Creates a new JsonProcessor instance.
   *
   * @param loggingEnabled - Whether to enable sanitization step logging. Defaults to true.
   */
  constructor(loggingEnabled = true) {
    this.loggingEnabled = loggingEnabled;
  }

  /**
   * Processes LLM-generated content through a multi-stage sanitization and repair pipeline,
   * then parses and validates it against a Zod schema. Returns a result object indicating success or failure.
   */
  parseAndValidate<T = Record<string, unknown>>(
    content: LLMGeneratedContent,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
  ): JsonProcessorResult<T> {
    if (typeof content !== "string") {
      const contentText = JSON.stringify(content);
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        `LLM response for resource '${resourceName}' is not a string`,
        contentText,
        contentText,
        [],
      );
      return { success: false, error };
    }

    return this.runSanitizationPipeline<T>(content, resourceName, completionOptions);
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
  ): JsonProcessorResult<T> {
    const logger = new JsonProcessingLogger(resourceName);
    const appliedSteps: string[] = [];
    const allDiagnostics: string[] = [];
    let lastSanitizer: string | undefined;

    const result = this.runPipelineLoop<T>(
      originalContent,
      resourceName,
      completionOptions,
      appliedSteps,
      allDiagnostics,
      (desc) => {
        lastSanitizer = desc;
      },
    );

    if (result.success) {
      if (this.loggingEnabled && hasSignificantSanitizationSteps(appliedSteps)) {
        logger.logSanitizationSummary(appliedSteps, allDiagnostics);
      }
      return {
        success: true,
        data: result.data,
        steps: appliedSteps,
        diagnostics: allDiagnostics.length > 0 ? allDiagnostics.join(" | ") : undefined,
      };
    }

    // Check if this is a validation error (which should be returned as-is)
    if (
      result.lastParseError instanceof JsonProcessingError &&
      result.lastParseError.type === JsonProcessingErrorType.VALIDATION
    ) {
      return { success: false, error: result.lastParseError };
    }

    // All sanitizers exhausted without success - return comprehensive parse error
    const error = new JsonProcessingError(
      JsonProcessingErrorType.PARSE,
      `LLM response for resource '${resourceName}' cannot be parsed to JSON after all sanitization attempts`,
      originalContent,
      result.workingContent,
      appliedSteps,
      result.lastParseError,
      lastSanitizer,
      allDiagnostics,
    );
    return { success: false, error };
  }

  /**
   * Core loop of the pipeline: tries parsing the raw content first (fast path),
   * then applies sanitizers one by one if the raw parse fails (slow path).
   * Returns success with data if parsing succeeds at any step, or
   * returns failure info if all sanitizers are exhausted.
   */
  private runPipelineLoop<T>(
    originalContent: string,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
    appliedSteps: string[],
    allDiagnostics: string[],
    onSanitizerApplied: (description: string) => void,
  ):
    | { success: true; data: T }
    | { success: false; workingContent: string; lastParseError?: Error } {
    // Attempt raw parse first (fast path)
    const fastPath = this.applySanitizerAndParse<T>(
      originalContent,
      resourceName,
      completionOptions,
      undefined,
      appliedSteps,
    );
    if (fastPath.kind === "success") {
      return { success: true, data: fastPath.data };
    }
    if (fastPath.kind === "validation-error") {
      return {
        success: false,
        workingContent: originalContent,
        lastParseError: fastPath.error,
      };
    }

    // Progressive sanitization path
    let workingContent = originalContent;
    let lastParseError: Error = fastPath.error; // initial parse error

    for (const sanitizer of this.SANITIZATION_ORDERED_PIPELINE) {
      const stepResult = sanitizer(workingContent);
      if (!stepResult.changed) continue;
      workingContent = stepResult.content;
      if (stepResult.description) {
        appliedSteps.push(stepResult.description);
        onSanitizerApplied(stepResult.description);
      }
      if (stepResult.diagnostics && stepResult.diagnostics.length > 0) {
        allDiagnostics.push(...stepResult.diagnostics);
      }

      const parseOutcome = this.applySanitizerAndParse<T>(
        workingContent,
        resourceName,
        completionOptions,
        stepResult.description,
        appliedSteps,
      );

      switch (parseOutcome.kind) {
        case "success":
          return { success: true, data: parseOutcome.data };
        case "validation-error": {
          return {
            success: false,
            workingContent,
            lastParseError: parseOutcome.error,
          };
        }
        case "parse-error": {
          lastParseError = parseOutcome.error;
          continue; // try next sanitizer
        }
      }
    }

    return { success: false, workingContent, lastParseError };
  }

  /**
   * Applies (optionally) a sanitizer context and then attempts parse + validate.
   * Returns a discriminated result capturing success, parse failure, or validation failure.
   */
  private applySanitizerAndParse<T>(
    content: string,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
    lastSanitizerDescription: string | undefined,
    appliedSteps: readonly string[],
  ):
    | { kind: "success"; data: T }
    | { kind: "parse-error"; error: Error }
    | { kind: "validation-error"; error: JsonProcessingError } {
    const parseAttempt = this.tryParseAndValidate<T>(content, resourceName, completionOptions);
    if (parseAttempt.success) {
      return { kind: "success", data: parseAttempt.data };
    }

    if (parseAttempt.errorType === JsonProcessingErrorType.VALIDATION) {
      const validationErr = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        `LLM response for resource '${resourceName}' parsed successfully but failed schema validation`,
        content,
        content,
        [...appliedSteps],
        parseAttempt.error,
        lastSanitizerDescription,
        undefined,
      );
      return { kind: "validation-error", error: validationErr };
    }

    // Parse error path
    return { kind: "parse-error", error: parseAttempt.error };
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
  ): ParseAndValidateResult<T> {
    let parsedContent: unknown;

    try {
      parsedContent = JSON.parse(content);
    } catch (err) {
      return {
        success: false,
        errorType: JsonProcessingErrorType.PARSE,
        error: err instanceof Error ? err : new Error(String(err)),
      };
    }

    return this.applyTransformsAndValidate<T>(parsedContent, resourceName, completionOptions);
  }

  /**
   * Applies post-parse transformations and validates the data against the schema.
   */
  private applyTransformsAndValidate<T>(
    parsedData: unknown,
    resourceName: string,
    completionOptions: LLMCompletionOptions,
  ): ParseAndValidateResult<T> {
    let transformedContent = parsedData;

    for (const transform of this.POST_PARSE_TRANSFORMS) {
      transformedContent = transform(transformedContent);
    }

    const validationResult = this.jsonValidator.validate<T>(
      transformedContent,
      completionOptions,
      resourceName,
      this.loggingEnabled,
    );

    if (!validationResult.success) {
      const validationError = new Error(
        `Schema validation failed: ${JSON.stringify(validationResult.issues)}`,
      );
      return {
        success: false,
        errorType: JsonProcessingErrorType.VALIDATION,
        error: validationError,
      };
    }

    return { success: true, data: validationResult.data as T };
  }
}
