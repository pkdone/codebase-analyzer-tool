import { z } from "zod";
import { LLMGeneratedContent, LLMCompletionOptions, LLMContext } from "../../types/llm.types";
import { JsonProcessingError, JsonProcessingErrorType } from "../types/json-processing.errors";
import { JsonProcessorResult } from "../types/json-processing-result.types";
import { logOneLineWarning } from "../../../utils/logging";
import { hasSignificantSanitizationSteps } from "../sanitizers";
import { parseJsonWithSanitizers } from "./json-parsing";
import { validateJsonWithTransforms } from "./json-validating";

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
 * Conditionally logs a warning message if logging is enabled.
 */
function logProblem(
  message: string,
  context: LLMContext | Record<string, unknown>,
  loggingEnabled: boolean,
): void {
  if (loggingEnabled) {
    logOneLineWarning(message, context);
  }
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
      `Applied ${transformSteps.length} schema fixing transform(s): ${transformSteps.join(", ")}`,
    );
  }

  if (messages.length > 0) logOneLineWarning(messages.join(" | "), context);
}

/**
 * Processes LLM-generated content through a multi-stage sanitization and repair pipeline,
 * then parses and validates it against a Zod schema. Returns a result object indicating success or failure.
 *
 * This is the high-level public API for JSON processing, orchestrating parsing and validation
 * with comprehensive logging.
 *
 * The function is generic over the schema type, enabling type-safe validation:
 * - When a schema is provided, returns z.infer<S> where S is the schema type
 * - When no schema is provided, returns Record<string, unknown>
 *
 * @template S - The Zod schema type. When provided, the return type is inferred from the schema.
 * @param content - The LLM-generated content to process
 * @param context - Context information about the LLM request
 * @param completionOptions - Options including output format and optional JSON schema
 * @param loggingEnabled - Whether to enable sanitization step logging. Defaults to true.
 * @param config - Optional sanitizer configuration to pass to transforms
 * @returns A JsonProcessorResult indicating success with validated data and steps, or failure with an error
 */
export function processJson<S extends z.ZodType = z.ZodType<Record<string, unknown>>>(
  content: LLMGeneratedContent,
  context: LLMContext,
  completionOptions: LLMCompletionOptions<S>,
  loggingEnabled = true,
  config?: import("../../config/llm-module-config.types").LLMSanitizerConfig,
): JsonProcessorResult<z.infer<S>> {
  // Pre-check - ensure content is a string
  if (typeof content !== "string") {
    const contentText = JSON.stringify(content);
    logProblem(
      `LLM response is not a string. Content: ${contentText.substring(0, 100)}`,
      context,
      loggingEnabled,
    );
    return { success: false, error: createParseError("is not a string", context) };
  }

  // Early detection: Check if content has any JSON-like structure at all
  if (!hasJsonLikeStructure(content)) {
    logProblem(
      `Contains no JSON structure (no objects or arrays found). The response appears to be plain text rather than JSON.`,
      { ...context, contentLength: content.length },
      loggingEnabled,
    );
    return {
      success: false,
      error: createParseError(
        "contains no JSON structure (no objects or arrays found). The response appears to be plain text rather than JSON.",
        context,
      ),
    };
  }

  // Parse the JSON content (with sanitizers applied internally)
  const parseResult = parseJsonWithSanitizers(content);

  // If can't parse, log failure and return error
  if (!parseResult.success) {
    const stepsMessage =
      parseResult.steps.length > 0
        ? `Applied sanitization steps: ${parseResult.steps.join(" -> ")}`
        : "No sanitization steps applied";
    logProblem(
      `Cannot parse JSON after all sanitization attempts. ${stepsMessage}`,
      {
        ...context,
        originalLength: content.length,
        lastSanitizer: parseResult.steps[parseResult.steps.length - 1],
        diagnosticsCount: parseResult.diagnostics ? parseResult.diagnostics.split(" | ").length : 0,
        responseContentParseError: parseResult.error.cause,
      },
      loggingEnabled,
    );
    return {
      success: false,
      error: createParseError(
        "cannot be parsed to JSON after all sanitization attempts",
        context,
        parseResult.error.cause instanceof Error ? parseResult.error.cause : undefined,
      ),
    };
  }

  // Extract schema for type narrowing
  const { jsonSchema } = completionOptions;

  // If no schema provided, return parsed data without validation.
  // Type is safe: when no schema is provided, the return type defaults to Record<string, unknown>
  // and parseResult.data is the parsed JSON object.
  if (!jsonSchema) {
    // Add a type guard to ensure the data is an object or array before casting.
    // This prevents unsafe casts when the parsed data is a primitive type or null.
    // Arrays are valid JSON and should be allowed.
    if (typeof parseResult.data !== "object" || parseResult.data === null) {
      return {
        success: false,
        error: createParseError(
          "expected a JSON object or array but received a primitive type or null",
          context,
        ),
      };
    }
    logProcessingSteps(parseResult.steps, parseResult.diagnostics, [], context, loggingEnabled);
    return {
      success: true,
      // The cast is now safer as we've confirmed the type is an object or array.
      data: parseResult.data as z.infer<S>,
      mutationSteps: parseResult.steps,
    };
  }

  // TypeScript now knows jsonSchema exists and is a z.ZodType.
  // Validate the parsed data (with transforms applied internally if needed).
  const validationResult = validateJsonWithTransforms(parseResult.data, jsonSchema, config);

  // Validation succeeded.
  if (validationResult.success) {
    logProcessingSteps(
      parseResult.steps,
      parseResult.diagnostics,
      validationResult.transformSteps,
      context,
      loggingEnabled,
    );
    return {
      success: true,
      data: validationResult.data,
      mutationSteps: [...parseResult.steps, ...validationResult.transformSteps],
    };
  }

  // Validation failed even after transforms
  const validationError = new Error(
    `Schema validation failed after applying transforms: ${JSON.stringify(validationResult.issues)}`,
  );
  logProblem(
    "Parsed successfully and applied transforms but still failed schema validation",
    {
      ...context,
      responseContentParseError: validationError,
      appliedTransforms: validationResult.transformSteps.join(", "),
    },
    loggingEnabled,
  );
  return {
    success: false,
    error: new JsonProcessingError(
      JsonProcessingErrorType.VALIDATION,
      buildResourceErrorMessage(
        "parsed successfully and applied transforms but still failed schema validation",
        context,
      ),
      validationError,
    ),
  };
}
