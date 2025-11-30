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
  // This helps provide clearer error messages for completely non-JSON responses
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

  // Step 2: Parse the JSON content (without post-parse transforms)
  const parseResult = parseJson(content);

  if (!parseResult.success) {
    // Log parse failure with context
    const stepsMessage =
      parseResult.steps.length > 0
        ? `Applied steps: ${parseResult.steps.join(" -> ")}`
        : "No sanitization steps applied";
    logOneLineWarning(`Cannot parse JSON after all sanitization attempts. ${stepsMessage}`, {
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

  // Track applied transforms
  let appliedTransforms: readonly string[] = [];
  let transformedData = parseResult.data;

  // Step 3: Validate the parsed data (only if schema is provided)
  if (completionOptions.jsonSchema) {
    // Step 3a: Try validation with raw parsed data first
    const firstValidationResult = validateJson<T>(
      transformedData,
      completionOptions,
      loggingEnabled,
    );

    if (firstValidationResult.success) {
      // Validation succeeded on first attempt - no transforms needed
      // Log sanitization steps if enabled and significant
      if (loggingEnabled && hasSignificantSanitizationSteps(parseResult.steps)) {
        let message = `Applied ${parseResult.steps.length} sanitization step(s): ${parseResult.steps.join(" -> ")}`;
        if (parseResult.diagnostics) {
          message += ` | Diagnostics: ${parseResult.diagnostics}`;
        }
        logOneLineWarning(message, context);
      }

      // Return success result with validated data
      return {
        success: true,
        data: firstValidationResult.data,
        steps: parseResult.steps,
        diagnostics: parseResult.diagnostics,
      };
    }

    // Step 3b: First validation failed - apply post-parse transforms
    const transformResult = applyPostParseTransforms(transformedData);
    transformedData = transformResult.data;
    appliedTransforms = transformResult.appliedTransforms;

    // Log transform application if transforms were applied
    if (loggingEnabled && appliedTransforms.length > 0) {
      logOneLineWarning(
        `Applied ${appliedTransforms.length} post-parse transform(s): ${appliedTransforms.join(", ")}`,
        context,
      );
    }

    // Step 3c: Try validation again with transformed data
    const secondValidationResult = validateJson<T>(
      transformedData,
      completionOptions,
      loggingEnabled,
    );

    if (!secondValidationResult.success) {
      // Log validation failure after transforms
      const validationError = new Error(
        `Schema validation failed after applying transforms: ${JSON.stringify(secondValidationResult.issues)}`,
      );
      logOneLineWarning(
        "Parsed successfully and applied transforms but still failed schema validation",
        {
          ...context,
          responseContentParseError: validationError,
          appliedTransforms: appliedTransforms.join(", "),
        },
      );
      const error = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        buildResourceErrorMessage(
          "parsed successfully and applied transforms but still failed schema validation",
          context,
        ),
        validationError,
      );
      return { success: false, error };
    }

    // Step 3d: Validation succeeded after transforms
    // Log both sanitization steps and transforms if enabled and significant
    if (loggingEnabled) {
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
      if (messages.length > 0) {
        logOneLineWarning(messages.join(" | "), context);
      }
    }

    // Return success result with validated data
    return {
      success: true,
      data: secondValidationResult.data,
      steps: parseResult.steps,
      diagnostics: parseResult.diagnostics,
    };
  }

  // No schema provided - apply transforms and return parsed data
  const transformResult = applyPostParseTransforms(transformedData);
  transformedData = transformResult.data;
  appliedTransforms = transformResult.appliedTransforms;

  // Log both sanitization steps and transforms if enabled and significant
  if (loggingEnabled) {
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
    if (messages.length > 0) {
      logOneLineWarning(messages.join(" | "), context);
    }
  }

  // Return success result with parsed data (no validation)
  return {
    success: true,
    data: transformedData as T,
    steps: parseResult.steps,
    diagnostics: parseResult.diagnostics,
  };
}
