import { LLMGeneratedContent, LLMCompletionOptions, LLMContext } from "../../types/llm.types";
import { JsonProcessingError, JsonProcessingErrorType } from "../types/json-processing.errors";
import { JsonProcessorResult } from "../types/json-processing-result.types";
import { logOneLineWarning } from "../../../common/utils/logging";
import { hasSignificantSanitizationSteps } from "../sanitizers";
import { parseJson, applyPostParseTransforms } from "./json-parsing";
import { validateJson } from "./json-validating";

/**
 * Checks if the content has any JSON-like structure (contains opening braces or brackets).
 * Used for early detection of completely non-JSON responses to provide better error messages.
 */
function hasJsonLikeStructure(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.includes("{") || trimmed.includes("[");
}

/**
 * Builds a standardized error message with resource context.
 */
function buildResourceErrorMessage(baseMessage: string, context: LLMContext): string {
  return `LLM response for resource '${context.resource}' ${baseMessage}`;
}

/**
 * Logs sanitization steps and transforms if enabled and significant.
 */
function logProcessingSteps(
  parseResult: { steps: readonly string[]; diagnostics?: string },
  appliedTransforms: readonly string[],
  loggingEnabled: boolean,
  context: LLMContext,
): void {
  if (!loggingEnabled) return;
  const messages: string[] = [];

  if (hasSignificantSanitizationSteps(parseResult.steps)) {
    let sanitizerMessage = `Applied ${parseResult.steps.length} sanitization step(s): ${parseResult.steps.join(" -> ")}`;
    if (parseResult.diagnostics) {
      sanitizerMessage += ` | Diagnostics: ${parseResult.diagnostics}`;
    }
    messages.push(sanitizerMessage);
  }

  if (appliedTransforms.length > 0) {
    messages.push(
      `Applied ${appliedTransforms.length} post-parse transform(s): ${appliedTransforms.join(", ")}`,
    );
  }

  if (messages.length > 0) logOneLineWarning(messages.join(" | "), context);
}

/**
 * Builds a success result object with validated/transformed data and parse metadata.
 */
function buildSuccessResult<T>(
  data: T,
  parseResult: { steps: readonly string[]; diagnostics?: string },
): JsonProcessorResult<T> {
  return {
    success: true,
    data,
    steps: parseResult.steps,
    diagnostics: parseResult.diagnostics,
  };
}

/**
 * Builds a validation error for cases where validation fails even after applying transforms.
 */
function buildValidationErrorAfterTransforms(
  validationResult: { issues: unknown[] },
  appliedTransforms: readonly string[],
  context: LLMContext,
): JsonProcessingError {
  const validationError = new Error(
    `Schema validation failed after applying transforms: ${JSON.stringify(validationResult.issues)}`,
  );
  logOneLineWarning(
    "Parsed successfully and applied transforms but still failed schema validation",
    {
      ...context,
      responseContentParseError: validationError,
      appliedTransforms: appliedTransforms.join(", "),
    },
  );
  return new JsonProcessingError(
    JsonProcessingErrorType.VALIDATION,
    buildResourceErrorMessage(
      "parsed successfully and applied transforms but still failed schema validation",
      context,
    ),
    validationError,
  );
}

/**
 * Processes LLM-generated content through a multi-stage sanitization and repair pipeline,
 * then parses and validates it against a Zod schema. Returns a result object indicating success or failure.
 *
 * This is the high-level public API for JSON processing, orchestrating parsing and validation
 * with comprehensive logging.
 *
 * @param content - The LLM-generated content to process
 * @param context - Context information about the LLM request
 * @param completionOptions - Options including output format and optional JSON schema
 * @param loggingEnabled - Whether to enable sanitization step logging. Defaults to true.
 * @returns A JsonProcessorResult indicating success with validated data and steps, or failure with an error
 */
export function processJson<T = Record<string, unknown>>(
  content: LLMGeneratedContent,
  context: LLMContext,
  completionOptions: LLMCompletionOptions,
  loggingEnabled = true,
): JsonProcessorResult<T> {
  // Pre-check - ensure content is a string
  if (typeof content !== "string") {
    const contentText = JSON.stringify(content);
    logOneLineWarning(
      `LLM response is not a string. Content: ${contentText.substring(0, 100)}`,
      context,
    );
    const error = new JsonProcessingError(
      JsonProcessingErrorType.PARSE,
      buildResourceErrorMessage("is not a string", context),
    );
    return { success: false, error };
  }

  // Early detection: Check if content has any JSON-like structure at all
  if (!hasJsonLikeStructure(content)) {
    logOneLineWarning(
      `Contains no JSON structure (no objects or arrays found). The response appears to be plain text rather than JSON.`,
      { ...context, contentLength: content.length },
    );
    const error = new JsonProcessingError(
      JsonProcessingErrorType.PARSE,
      buildResourceErrorMessage(
        "contains no JSON structure (no objects or arrays found). The response appears to be plain text rather than JSON.",
        context,
      ),
    );
    return { success: false, error };
  }

  // Parse the JSON content (without post-parse transforms)
  const parseResult = parseJson(content);

  // If can't parse, log failure and return error
  if (!parseResult.success) {
    const stepsMessage =
      parseResult.steps.length > 0
        ? `Applied steps: ${parseResult.steps.join(" -> ")}`
        : "No sanitization steps applied";
    logOneLineWarning(`Cannot parse JSON after all sanitization attempts. ${stepsMessage}`, {
      ...context,
      originalLength: content.length,
      lastSanitizer: parseResult.steps[parseResult.steps.length - 1],
      diagnosticsCount: parseResult.diagnostics ? parseResult.diagnostics.split(" | ").length : 0,
      responseContentParseError: parseResult.error.cause,
    });
    const error = new JsonProcessingError(
      JsonProcessingErrorType.PARSE,
      buildResourceErrorMessage(
        "cannot be parsed to JSON after all sanitization attempts",
        context,
      ),
      parseResult.error.cause instanceof Error ? parseResult.error.cause : undefined,
    );
    return { success: false, error };
  }

  // Validate the parsed data (only if schema is provided)
  if (completionOptions.jsonSchema) {
    // Try validation with raw parsed data first
    const initialValidation = validateJson<T>(parseResult.data, completionOptions, loggingEnabled);

    // If validation succeeded on first attempt, no transforms needed so return
    if (initialValidation.success) {
      logProcessingSteps(parseResult, [], loggingEnabled, context);
      return buildSuccessResult(initialValidation.data, parseResult);
    }

    // Initial validation failed so apply post-parse transforms
    const transformResult = applyPostParseTransforms(parseResult.data);
    const transformedData = transformResult.data;
    const appliedTransforms = transformResult.appliedTransforms;

    // Try validation again with transformed data
    const validationAfterTransforms = validateJson<T>(
      transformedData,
      completionOptions,
      loggingEnabled,
    );

    // Validation failed even after transforms
    if (!validationAfterTransforms.success) {
      const error = buildValidationErrorAfterTransforms(
        validationAfterTransforms,
        appliedTransforms,
        context,
      );
      return { success: false, error };
    }

    // Validation succeeded after transforms
    logProcessingSteps(parseResult, appliedTransforms, loggingEnabled, context);
    return buildSuccessResult(validationAfterTransforms.data, parseResult);
  }

  // No schema provided - return parsed data without transforms
  logProcessingSteps(parseResult, [], loggingEnabled, context);
  return buildSuccessResult(parseResult.data as T, parseResult);
}
