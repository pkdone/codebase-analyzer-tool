import { LLMGeneratedContent, LLMCompletionOptions } from "../../types/llm.types";
import { JsonProcessingError, JsonProcessingErrorType } from "../types/json-processing.errors";
import { JsonValidator } from "./json-validator";
import {
  unwrapJsonSchemaStructure,
  convertNullToUndefined,
  normalizeDatabaseIntegrationArray,
  fixParameterPropertyNameTypos,
} from "../utils/post-parse-transforms";
import { JsonProcessingLogger } from "./json-processing-logger";
import { JsonProcessorResult } from "../json-processing-result.types";
import {
  trimWhitespace,
  removeCodeFences,
  normalizeEscapeSequences,
  fixCurlyQuotes,
  removeThoughtMarkers,
  removeStrayLinePrefixChars,
  extractLargestJsonSpan,
  collapseDuplicateJsonObject,
  fixMismatchedDelimiters,
  addMissingPropertyCommas,
  removeTrailingCommas,
  concatenationChainSanitizer,
  completeTruncatedStructures,
  fixPropertyNames,
  fixMissingArrayObjectBraces,
  fixMissingOpeningQuoteInArrayStrings,
  fixUndefinedValues,
  fixUnescapedQuotesInStrings,
  fixStrayTextBeforePropertyNames,
  fixStrayCharsAfterPropertyValues,
  removeStrayLinesBetweenStructures,
  removeTruncationMarkers,
  fixAssignmentSyntax,
  fixUnquotedStringValues,
  fixStrayTextBetweenColonAndValue,
  fixBinaryCorruptionPatterns,
  fixCorruptedNumericValues,
  fixTruncatedPropertyValues,
  fixMissingQuotesAroundPropertyValues,
  fixCorruptedTextInDescriptions,
  fixTruncatedValueInArrayElements,
  fixCorruptedPropertyValuePairs,
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
   * The order is critical for effective JSON repair. Sanitizers are organized into logical phases:
   *
   * Phase 1: Noise Removal (1-6)
   *   Removes formatting artifacts and noise before structural analysis
   *   1. trimWhitespace - Remove leading/trailing whitespace
   *   2. removeCodeFences - Strip markdown code fences (```json)
   *   3. normalizeEscapeSequences - Normalize escape sequences and control characters (consolidates 4 sanitizers)
   *   4. fixCurlyQuotes - Convert curly quotes to regular ASCII quotes
   *   5. removeThoughtMarkers - Remove LLM thought markers and text before JSON
   *   6. removeStrayLinePrefixChars - Remove stray characters at the start of lines
   *
   * Phase 2: Structure Extraction & Basic Fixes (7-13)
   *   Extracts JSON structure and fixes basic structural issues
   *   7. extractLargestJsonSpan - Isolate the main JSON structure from surrounding text
   *   8. collapseDuplicateJsonObject - Fix cases where LLMs repeat the entire JSON object
   *   9. fixMismatchedDelimiters - Correct bracket/brace mismatches
   *   10. addMissingPropertyCommas - Insert missing commas between object properties
   *   11. removeTrailingCommas - Remove invalid trailing commas
   *   12. concatenationChainSanitizer - Fix string concatenation expressions (e.g., "BASE + '/path'")
   *   13. completeTruncatedStructures - Close any unclosed brackets/braces from truncated responses
   *
   * Phase 3: Property & Structure Fixes (14-16)
   *   Fixes property names and array object structures
   *   14. fixPropertyNames - Fix all property name issues (consolidates 7 sanitizers: truncations, typos, unquoted, concatenated, missing quotes)
   *   15. fixMissingArrayObjectBraces - Insert missing opening braces for new objects in arrays (consolidates 3 sanitizers)
   *   16. fixMissingOpeningQuoteInArrayStrings - Fix missing opening quotes in array string values
   *
   * Phase 4: Value & Content Fixes (17-32)
   *   Fixes property values, stray text, and content corruption
   *   17. fixUndefinedValues - Convert undefined values to null
   *   18. fixUnescapedQuotesInStrings - Escape unescaped quotes inside string values (HTML/code snippets)
   *   19. fixCorruptedTextInDescriptions - Fix corrupted text patterns in string values
   *   20. fixStrayTextBeforePropertyNames - Remove stray text before property names (handles both quoted and unquoted)
   *   21. fixStrayCharsAfterPropertyValues - Remove stray characters after property values
   *   22. removeStrayLinesBetweenStructures - Remove complete stray lines between JSON structures
   *   23. fixBinaryCorruptionPatterns - Fix binary corruption patterns (e.g., <y_bin_XXX> markers)
   *   24. removeTruncationMarkers - Remove truncation markers (e.g., ...)
   *   25. fixAssignmentSyntax - Fix assignment syntax (:= to :)
   *   26. fixUnquotedStringValues - Add quotes around unquoted string values
   *   27. fixMissingQuotesAroundPropertyValues - Fix missing quotes around property values
   *   28. fixCorruptedNumericValues - Fix corrupted numeric values like _3 -> 3
   *   29. fixStrayTextBetweenColonAndValue - Remove stray text between colon and opening quote of value
   *   30. fixTruncatedPropertyValues - Fix truncated property values (e.g., "type " -> "type": "String")
   *   31. fixTruncatedValueInArrayElements - Fix truncated property values in array elements
   *   32. fixCorruptedPropertyValuePairs - Fix corrupted property/value pairs (e.g., "name":ICCID": "value")
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
    normalizeEscapeSequences, // Normalize escape sequences and control characters (consolidates removeControlChars, escapeControlCharsInStrings, fixInvalidEscapeSequences, overEscapedSequences)
    fixCurlyQuotes,
    removeThoughtMarkers,
    removeStrayLinePrefixChars,
    extractLargestJsonSpan,
    collapseDuplicateJsonObject,
    fixMismatchedDelimiters,
    addMissingPropertyCommas,
    removeTrailingCommas,
    concatenationChainSanitizer,
    completeTruncatedStructures,
    fixPropertyNames, // Consolidated sanitizer fixing all property name issues (truncations, typos, unquoted, concatenated, missing quotes)
    fixMissingArrayObjectBraces, // Consolidated sanitizer fixing missing opening braces for array objects
    fixMissingOpeningQuoteInArrayStrings,
    fixUndefinedValues,
    fixUnescapedQuotesInStrings,
    fixCorruptedTextInDescriptions, // Fix corrupted text patterns in string values
    fixStrayTextBeforePropertyNames,
    fixStrayCharsAfterPropertyValues,
    removeStrayLinesBetweenStructures,
    fixBinaryCorruptionPatterns,
    removeTruncationMarkers,
    fixAssignmentSyntax,
    fixUnquotedStringValues,
    fixMissingQuotesAroundPropertyValues, // Fix missing quotes around property values (e.g., "name":value" -> "name": "value")
    fixCorruptedNumericValues, // Fix corrupted numeric values like _3 -> 3
    fixStrayTextBetweenColonAndValue,
    fixTruncatedPropertyValues, // Fix truncated property values (e.g., "type " -> "type": "String")
    fixTruncatedValueInArrayElements, // Fix truncated property values in array elements missing opening brace and property name
    fixCorruptedPropertyValuePairs, // Fix corrupted property/value pairs (e.g., "name":ICCID": "value")
  ] as const satisfies readonly Sanitizer[];

  /**
   * Post-parse transformations applied after successful JSON.parse but before validation.
   * These operate on the parsed object structure rather than raw strings.
   *
   * Currently contains:
   * - convertNullToUndefined: Converts null to undefined for optional fields (applied first)
   * - unwrapJsonSchemaStructure: Unwraps when LLM returns JSON Schema instead of data
   * - normalizeDatabaseIntegrationArray: Converts databaseIntegration from array to single object
   */
  private readonly POST_PARSE_TRANSFORMS: readonly PostParseTransform[] = [
    convertNullToUndefined,
    fixParameterPropertyNameTypos,
    unwrapJsonSchemaStructure,
    normalizeDatabaseIntegrationArray,
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

    // Early detection: Check if content has any JSON-like structure at all
    // This helps provide clearer error messages for completely non-JSON responses
    if (!this.hasJsonLikeStructure(content)) {
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        `LLM response for resource '${resourceName}' contains no JSON structure (no objects or arrays found). The response appears to be plain text rather than JSON.`,
        content,
        content,
        [],
      );
      return { success: false, error };
    }

    return this.runSanitizationPipeline<T>(content, resourceName, completionOptions);
  }

  /**
   * Checks if the content has any JSON-like structure (contains opening braces or brackets).
   * Used for early detection of completely non-JSON responses to provide better error messages.
   */
  private hasJsonLikeStructure(content: string): boolean {
    const trimmed = content.trim();
    // Check for opening JSON delimiters (after removing code fences and whitespace)
    // This is a simple heuristic - if there's no { or [, it's likely not JSON
    return trimmed.includes("{") || trimmed.includes("[");
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
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
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
    const fastPathResult = this._tryParseAndValidate<T>(
      originalContent,
      resourceName,
      completionOptions,
    );
    if (fastPathResult.success) {
      return { success: true, data: fastPathResult.data };
    }
    if (fastPathResult.errorType === JsonProcessingErrorType.VALIDATION) {
      const validationError = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        `LLM response for resource '${resourceName}' parsed successfully but failed schema validation`,
        originalContent,
        originalContent,
        appliedSteps,
        fastPathResult.error,
        undefined,
        undefined,
      );
      return {
        success: false,
        workingContent: originalContent,
        lastParseError: validationError,
      };
    }

    // Progressive sanitization path
    let workingContent = originalContent;
    let lastParseError: Error = fastPathResult.error; // initial parse error

    for (const sanitizer of this.SANITIZATION_ORDERED_PIPELINE) {
      const { newContent, changed } = this._applySanitizer(
        sanitizer,
        workingContent,
        appliedSteps,
        allDiagnostics,
      );
      if (!changed) continue;

      workingContent = newContent;
      if (sanitizer.name) {
        onSanitizerApplied(sanitizer.name);
      }

      const parseResult = this._tryParseAndValidate<T>(
        workingContent,
        resourceName,
        completionOptions,
      );
      if (parseResult.success) {
        return { success: true, data: parseResult.data };
      }
      if (parseResult.errorType === JsonProcessingErrorType.VALIDATION) {
        // Return validation error immediately
        const validationError = new JsonProcessingError(
          JsonProcessingErrorType.VALIDATION,
          `LLM response for resource '${resourceName}' parsed successfully but failed schema validation`,
          originalContent,
          workingContent,
          appliedSteps,
          parseResult.error,
          sanitizer.name,
          undefined,
        );
        return {
          success: false,
          workingContent,
          lastParseError: validationError,
        };
      }
      lastParseError = parseResult.error;
    }

    return { success: false, workingContent, lastParseError };
  }

  /**
   * Applies a single sanitizer and updates tracking arrays.
   * Returns the new content and whether changes were made.
   */
  private _applySanitizer(
    sanitizer: Sanitizer,
    content: string,
    appliedSteps: string[],
    allDiagnostics: string[],
  ): { newContent: string; changed: boolean } {
    const stepResult = sanitizer(content);
    if (!stepResult.changed) {
      return { newContent: content, changed: false };
    }

    if (stepResult.description) {
      appliedSteps.push(stepResult.description);
    }
    if (stepResult.diagnostics && stepResult.diagnostics.length > 0) {
      allDiagnostics.push(...stepResult.diagnostics);
    }

    return { newContent: stepResult.content, changed: true };
  }

  /**
   * Attempts to parse the given content as JSON and validate it against the schema.
   * Returns a result indicating success or failure, distinguishing between parse errors
   * (JSON syntax issues) and validation errors (valid JSON that doesn't match schema).
   */
  private _tryParseAndValidate<T>(
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
