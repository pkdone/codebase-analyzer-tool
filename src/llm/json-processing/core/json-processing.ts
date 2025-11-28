import { LLMGeneratedContent, LLMCompletionOptions, LLMContext } from "../../types/llm.types";
import { JsonProcessingError, JsonProcessingErrorType } from "../types/json-processing.errors";
import { JsonProcessorResult } from "../types/json-processing-result.types";
import { logSingleLineWarning } from "../../../common/utils/logging";
import { hasSignificantSanitizationSteps } from "../sanitizers";
import { parseJson } from "./json-parsing";
import { validateJson } from "./json-validating";

/**
 * Checks if the content has any JSON-like structure (contains opening braces or brackets).
 * Used for early detection of completely non-JSON responses to provide better error messages.
 */
function hasJsonLikeStructure(content: string): boolean {
  const trimmed = content.trim();
  // Check for opening JSON delimiters (after removing code fences and whitespace)
  // This is a simple heuristic - if there's no { or [, it's likely not JSON
  return trimmed.includes("{") || trimmed.includes("[");
}

/**
 * Builds a standardized error message with resource context.
 */
function buildResourceErrorMessage(baseMessage: string, context: LLMContext): string {
  return `LLM response for resource '${context.resource}' ${baseMessage}`;
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
  // Step 1: Pre-check - ensure content is a string
  if (typeof content !== "string") {
    const contentText = JSON.stringify(content);
    logSingleLineWarning(
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
  // This helps provide clearer error messages for completely non-JSON responses
  if (!hasJsonLikeStructure(content)) {
    logSingleLineWarning(
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

  // Step 2: Parse the JSON content
  const parseResult = parseJson(content);

  if (!parseResult.success) {
    // Log parse failure with context
    const stepsMessage =
      parseResult.steps.length > 0
        ? `Applied steps: ${parseResult.steps.join(" -> ")}`
        : "No sanitization steps applied";
    logSingleLineWarning(`Cannot parse JSON after all sanitization attempts. ${stepsMessage}`, {
      ...context,
      originalLength: content.length,
      sanitizedLength: content.length, // Content length after sanitization attempts
      lastSanitizer: parseResult.steps[parseResult.steps.length - 1],
      diagnosticsCount: parseResult.diagnostics ? parseResult.diagnostics.split(" | ").length : 0,
      responseContentParseError: parseResult.error.cause,
    });
    // Update error message with resource context
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

  // Step 3: Validate the parsed data
  const validationResult = validateJson<T>(parseResult.data, completionOptions, loggingEnabled);

  if (!validationResult.success) {
    // Log validation failure
    const validationError = new Error(
      `Schema validation failed: ${JSON.stringify(validationResult.issues)}`,
    );
    logSingleLineWarning("Parsed successfully but failed schema validation", {
      ...context,
      responseContentParseError: validationError,
    });
    const error = new JsonProcessingError(
      JsonProcessingErrorType.VALIDATION,
      buildResourceErrorMessage("parsed successfully but failed schema validation", context),
      validationError,
    );
    return { success: false, error };
  }

  // Step 4: Both parsing and validation succeeded
  // Log sanitization steps if enabled and significant
  if (loggingEnabled && hasSignificantSanitizationSteps(parseResult.steps)) {
    let message = `Applied ${parseResult.steps.length} sanitization step(s): ${parseResult.steps.join(" -> ")}`;
    if (parseResult.diagnostics) {
      message += ` | Diagnostics: ${parseResult.diagnostics}`;
    }
    logSingleLineWarning(message, context);
  }

  // Step 5: Return success result
  return {
    success: true,
    data: validationResult.data,
    steps: parseResult.steps,
    diagnostics: parseResult.diagnostics,
  };
}
