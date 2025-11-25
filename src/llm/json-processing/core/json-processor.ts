import { LLMGeneratedContent, LLMCompletionOptions, LLMContext } from "../../types/llm.types";
import { JsonProcessingError, JsonProcessingErrorType } from "../types/json-processing.errors";
import { JsonValidator } from "./json-validator";
import { convertNullToUndefined } from "../transforms/convert-null-to-undefined";
import {
  unwrapJsonSchemaStructure,
  normalizeDatabaseIntegrationArray,
  fixParameterPropertyNameTypos,
  fixMissingRequiredFields,
  fixParametersFieldType,
} from "../transforms/post-parse-transforms";
import { logSingleLineWarning } from "../../../common/utils/logging";
import { JsonProcessorResult } from "../json-processing-result.types";
import {
  fixJsonStructureAndNoise,
  fixJsonSyntax,
  normalizeCharacters,
  fixJsonStructure,
  unifiedSyntaxSanitizer,
  fixBinaryCorruptionPatterns,
  fixHeuristicJsonErrors,
  fixMalformedJsonPatterns,
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
   * Unified, ordered pipeline of sanitizers organized into logical phases.
   *
   * The order is critical for effective JSON repair. Sanitizers are organized into phases
   * that reflect the logical progression of fixing JSON issues:
   *
   * Phase 1: Structural & Noise Removal (Consolidated)
   *   Removes formatting artifacts, noise, and fixes high-level structural issues
   *   - fixJsonStructureAndNoise: Consolidated sanitizer that handles:
   *     * Trimming whitespace
   *     * Removing code fences
   *     * Removing invalid prefixes
   *     * Extracting largest JSON span
   *     * Collapsing duplicate objects
   *     * Removing truncation markers
   *
   * Phase 2: Character Normalization
   *   Normalizes escape sequences, control characters, and curly quotes
   *   - normalizeCharacters: Normalize escape sequences, control characters, and curly quotes
   *
   * Phase 3: Syntax Fixes (Consolidated)
   *   Fixes common JSON syntax errors
   *   - fixJsonSyntax: Consolidated sanitizer that handles:
   *     * Adding missing commas
   *     * Removing trailing commas
   *     * Fixing mismatched delimiters
   *     * Completing truncated structures
   *     * Fixing missing array object braces
   *
   * Phase 4: Property & Value Fixes
   *   Fixes property names and value syntax issues
   *   - fixJsonStructure: Post-processing fixes for various structural issues
   *   - unifiedSyntaxSanitizer: Unified property and value syntax fixes
   *   - fixHeuristicJsonErrors: Fixes assorted malformed patterns
   *   - fixMalformedJsonPatterns: Fixes specific malformed patterns
   *
   * Phase 5: Content Fixes
   *   Fixes content corruption
   *   - fixBinaryCorruptionPatterns: Fix binary corruption patterns (e.g., <y_bin_XXX> markers)
   *
   * Note: JSON Schema unwrapping is handled in POST_PARSE_TRANSFORMS after successful parsing,
   * which is more efficient than attempting to parse during sanitization.
   *
   * Each sanitizer only runs if it makes changes. Parsing is attempted after each step,
   * so earlier sanitizers have priority in fixing issues.
   */
  private readonly SANITIZATION_PIPELINE_PHASES = [
    // Phase 1: Structural & Noise Removal (Consolidated)
    [fixJsonStructureAndNoise],
    // Phase 2: Character Normalization
    [normalizeCharacters],
    // Phase 3: Syntax Fixes (Consolidated)
    [fixJsonSyntax],
    // Phase 4: Property & Value Fixes
    [fixJsonStructure, unifiedSyntaxSanitizer, fixHeuristicJsonErrors, fixMalformedJsonPatterns],
    // Phase 5: Content Fixes
    [fixBinaryCorruptionPatterns],
  ] as const satisfies readonly (readonly Sanitizer[])[];

  /**
   * Post-parse transformations applied after successful JSON.parse but before validation.
   * These operate on the parsed object structure rather than raw strings.
   *
   * Currently contains:
   * - fixParametersFieldType: Converts string parameters field to array in publicMethods
   * - convertNullToUndefined: Converts null to undefined for optional fields
   * - fixParameterPropertyNameTypos: Fixes typos in parameter property names
   * - unwrapJsonSchemaStructure: Unwraps when LLM returns JSON Schema instead of data
   * - normalizeDatabaseIntegrationArray: Converts databaseIntegration from array to single object
   * - fixMissingRequiredFields: Adds missing required fields in publicMethods
   */
  private readonly POST_PARSE_TRANSFORMS: readonly PostParseTransform[] = [
    fixParametersFieldType,
    convertNullToUndefined,
    fixParameterPropertyNameTypos,
    unwrapJsonSchemaStructure,
    normalizeDatabaseIntegrationArray,
    fixMissingRequiredFields,
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
    context: LLMContext,
    completionOptions: LLMCompletionOptions,
  ): JsonProcessorResult<T> {
    if (typeof content !== "string") {
      const contentText = JSON.stringify(content);
      logSingleLineWarning(
        `LLM response is not a string. Content: ${contentText.substring(0, 100)}`,
        context,
      );
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        `LLM response for resource '${context.resource}' is not a string`,
      );
      return { success: false, error };
    }

    // Early detection: Check if content has any JSON-like structure at all
    // This helps provide clearer error messages for completely non-JSON responses
    if (!this.hasJsonLikeStructure(content)) {
      logSingleLineWarning(
        `Contains no JSON structure (no objects or arrays found). The response appears to be plain text rather than JSON.`,
        { ...context, contentLength: content.length },
      );
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        `LLM response for resource '${context.resource}' contains no JSON structure (no objects or arrays found). The response appears to be plain text rather than JSON.`,
      );
      return { success: false, error };
    }

    return this.runSanitizationPipeline<T>(content, context, completionOptions);
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
    context: LLMContext,
    completionOptions: LLMCompletionOptions,
  ): JsonProcessorResult<T> {
    const appliedSteps: string[] = [];
    const allDiagnostics: string[] = [];
    let lastSanitizer: string | undefined;

    const result = this.runPipelineLoop<T>(
      originalContent,
      context,
      completionOptions,
      appliedSteps,
      allDiagnostics,
      (desc) => {
        lastSanitizer = desc;
      },
    );

    if (result.success) {
      if (this.loggingEnabled && hasSignificantSanitizationSteps(appliedSteps)) {
        let message = `Applied ${appliedSteps.length} sanitization step(s): ${appliedSteps.join(" -> ")}`;
        if (allDiagnostics.length > 0) message += ` | Diagnostics: ${allDiagnostics.join(" | ")}`;
        logSingleLineWarning(message, context);
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
    // Log context before creating the error
    logSingleLineWarning(
      `Cannot parse JSON after all sanitization attempts. Applied steps: ${appliedSteps.join(" -> ")}`,
      {
        ...context,
        originalLength: originalContent.length,
        sanitizedLength: result.workingContent.length,
        lastSanitizer,
        diagnosticsCount: allDiagnostics.length,
        responseContentParseError: result.lastParseError,
      },
    );
    const error = new JsonProcessingError(
      JsonProcessingErrorType.PARSE,
      `LLM response for resource '${context.resource}' cannot be parsed to JSON after all sanitization attempts`,
      result.lastParseError,
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
    context: LLMContext,
    completionOptions: LLMCompletionOptions,
    appliedSteps: string[],
    allDiagnostics: string[],
    onSanitizerApplied: (description: string) => void,
  ):
    | { success: true; data: T }
    | { success: false; workingContent: string; lastParseError?: Error } {
    const fastPathResult = this._tryParseAndValidate<T>(
      originalContent,
      context,
      completionOptions,
    );

    if (fastPathResult.success) return { success: true, data: fastPathResult.data };

    if (fastPathResult.errorType === JsonProcessingErrorType.VALIDATION) {
      logSingleLineWarning("Parsed successfully but failed schema validation", {
        ...context,
        responseContentParseError: fastPathResult.error,
      });
      const validationError = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        `LLM response for resource '${context.resource}' parsed successfully but failed schema validation`,
        fastPathResult.error,
      );
      return {
        success: false,
        workingContent: originalContent,
        lastParseError: validationError,
      };
    }

    let workingContent = originalContent;
    let lastParseError: Error = fastPathResult.error; // initial parse error

    // Iterate through phases, then through sanitizers within each phase
    for (const phase of this.SANITIZATION_PIPELINE_PHASES) {
      for (const sanitizer of phase) {
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
          context,
          completionOptions,
        );

        if (parseResult.success) return { success: true, data: parseResult.data };

        if (parseResult.errorType === JsonProcessingErrorType.VALIDATION) {
          logSingleLineWarning(
            `Parsed successfully but failed schema validation after sanitizer: ${sanitizer.name}`,
            { ...context, responseContentParseError: parseResult.error },
          );
          const validationError = new JsonProcessingError(
            JsonProcessingErrorType.VALIDATION,
            `LLM response for resource '${context.resource}' parsed successfully but failed schema validation`,
            parseResult.error,
          );
          return {
            success: false,
            workingContent,
            lastParseError: validationError,
          };
        }
        lastParseError = parseResult.error;
      }
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
    context: LLMContext,
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

    return this.applyTransformsAndValidate<T>(parsedContent, context, completionOptions);
  }

  /**
   * Applies post-parse transformations and validates the data against the schema.
   */
  private applyTransformsAndValidate<T>(
    parsedData: unknown,
    _context: LLMContext,
    completionOptions: LLMCompletionOptions,
  ): ParseAndValidateResult<T> {
    let transformedContent = parsedData;

    for (const transform of this.POST_PARSE_TRANSFORMS) {
      transformedContent = transform(transformedContent);
    }

    const validationResult = this.jsonValidator.validate<T>(
      transformedContent,
      completionOptions,
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
