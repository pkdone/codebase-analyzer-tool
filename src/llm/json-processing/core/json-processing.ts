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
 * Creates a parse error with standardized message formatting.
 */
function createParseError(
  message: string,
  context: LLMContext,
  cause?: Error,
): JsonProcessingError {
  return new JsonProcessingError(
    JsonProcessingErrorType.PARSE,
    buildResourceErrorMessage(message, context),
    cause,
  );
}

/**
 * Logs sanitization steps and transforms if enabled and significant.
 */
function logProcessingSteps(
  sanitizationSteps: readonly string[],
  sanitizationDiagnostics: string | undefined,
  transformSteps: readonly string[],
  context: LLMContext,
  loggingEnabled: boolean,
): void {
  if (!loggingEnabled) return;

  const messages: string[] = [];

  if (hasSignificantSanitizationSteps(sanitizationSteps)) {
    let sanitizerMessage = `Applied ${sanitizationSteps.length} sanitization step(s): ${sanitizationSteps.join(" -> ")}`;
    if (sanitizationDiagnostics) sanitizerMessage += ` | Diagnostics: ${sanitizationDiagnostics}`;
    messages.push(sanitizerMessage);
  }

  if (transformSteps.length > 0) {
    messages.push(
      `Applied ${transformSteps.length} post-parse transform(s): ${transformSteps.join(", ")}`,
    );
  }

  if (messages.length > 0) logOneLineWarning(messages.join(" | "), context);
}

/**
 * Builds a validation error for cases where validation fails even after applying transforms.
 */
function buildValidationErrorAfterTransforms(
  validationResult: { issues: unknown[] },
  transformSteps: readonly string[],
  context: LLMContext,
  loggingEnabled: boolean,
): JsonProcessingError {
  const validationError = new Error(
    `Schema validation failed after applying transforms: ${JSON.stringify(validationResult.issues)}`,
  );
  if (loggingEnabled) {
    logOneLineWarning(
      "Parsed successfully and applied transforms but still failed schema validation",
      {
        ...context,
        responseContentParseError: validationError,
        appliedTransforms: transformSteps.join(", "),
      },
    );
  }
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
    if (loggingEnabled) {
      logOneLineWarning(
        `LLM response is not a string. Content: ${contentText.substring(0, 100)}`,
        context,
      );
    }
    return { success: false, error: createParseError("is not a string", context) };
  }

  // Early detection: Check if content has any JSON-like structure at all
  if (!hasJsonLikeStructure(content)) {
    if (loggingEnabled) {
      logOneLineWarning(
        `Contains no JSON structure (no objects or arrays found). The response appears to be plain text rather than JSON.`,
        { ...context, contentLength: content.length },
      );
    }
    return {
      success: false,
      error: createParseError(
        "contains no JSON structure (no objects or arrays found). The response appears to be plain text rather than JSON.",
        context,
      ),
    };
  }

  // Parse the JSON content (without post-parse transforms)
  const parseResult = parseJson(content);

  // If can't parse, log failure and return error
  if (!parseResult.success) {
    const stepsMessage =
      parseResult.steps.length > 0
        ? `Applied sanitization steps: ${parseResult.steps.join(" -> ")}`
        : "No sanitization steps applied";
    if (loggingEnabled) {
      logOneLineWarning(`Cannot parse JSON after all sanitization attempts. ${stepsMessage}`, {
        ...context,
        originalLength: content.length,
        lastSanitizer: parseResult.steps[parseResult.steps.length - 1],
        diagnosticsCount: parseResult.diagnostics ? parseResult.diagnostics.split(" | ").length : 0,
        responseContentParseError: parseResult.error.cause,
      });
    }
    return {
      success: false,
      error: createParseError(
        "cannot be parsed to JSON after all sanitization attempts",
        context,
        parseResult.error.cause instanceof Error ? parseResult.error.cause : undefined,
      ),
    };
  }

  // If no schema provided, return parsed data without validation or transforms
  if (!completionOptions.jsonSchema) {
    logProcessingSteps(parseResult.steps, parseResult.diagnostics, [], context, loggingEnabled);
    return {
      success: true,
      data: parseResult.data as T,
      mutationSteps: parseResult.steps,
    };
  }

  // Validate the parsed data
  const initialValidation = validateJson<T>(
    parseResult.data,
    completionOptions,
    false,
    loggingEnabled,
  );

  // If validation succeeded on first attempt, no transforms needed
  if (initialValidation.success) {
    logProcessingSteps(parseResult.steps, parseResult.diagnostics, [], context, loggingEnabled);
    return {
      success: true,
      data: initialValidation.data,
      mutationSteps: parseResult.steps,
    };
  }

  // Initial validation failed, so apply post-parse transforms
  const transformResult = applyPostParseTransforms(parseResult.data);
  const validationAfterTransforms = validateJson<T>(
    transformResult.data,
    completionOptions,
    true,
    loggingEnabled,
  );

  // Validation failed even after transforms
  if (!validationAfterTransforms.success) {
    return {
      success: false,
      error: buildValidationErrorAfterTransforms(
        validationAfterTransforms,
        transformResult.steps,
        context,
        loggingEnabled,
      ),
    };
  }

  // Validation succeeded after transforms
  logProcessingSteps(
    parseResult.steps,
    parseResult.diagnostics,
    transformResult.steps,
    context,
    loggingEnabled,
  );
  return {
    success: true,
    data: validationAfterTransforms.data,
    mutationSteps: [...parseResult.steps, ...transformResult.steps],
  };
}
