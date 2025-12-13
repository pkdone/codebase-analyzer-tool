import { z } from "zod";
import { LLMGeneratedContent, LLMCompletionOptions, LLMContext } from "../../types/llm.types";
import { JsonProcessingError, JsonProcessingErrorType } from "../types/json-processing.errors";
import { JsonProcessorResult } from "../types/json-processing-result.types";
import { logOneLineWarning } from "../../../common/utils/logging";
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
 * When a schema is provided, the return type is inferred from the schema using `z.infer<S>`.
 * When no schema is provided, the return type defaults to `Record<string, unknown>`.
 *
 * @param content - The LLM-generated content to process
 * @param context - Context information about the LLM request
 * @param completionOptions - Options including output format and optional JSON schema
 * @param loggingEnabled - Whether to enable sanitization step logging. Defaults to true.
 * @returns A JsonProcessorResult indicating success with validated data and steps, or failure with an error
 */

// Overload for when a schema is provided - infers return type from schema
// Extract schema type using a helper to avoid strict structural checking
type ExtractSchemaType<T> = T extends { jsonSchema: infer S }
  ? S extends z.ZodType
    ? S
    : never
  : never;

export function processJson<TOptions extends LLMCompletionOptions & { jsonSchema: z.ZodType }>(
  content: LLMGeneratedContent,
  context: LLMContext,
  completionOptions: TOptions,
  loggingEnabled?: boolean,
): JsonProcessorResult<z.infer<ExtractSchemaType<TOptions>>>;

// Overload for when no schema is provided - returns Record<string, unknown>
export function processJson(
  content: LLMGeneratedContent,
  context: LLMContext,
  completionOptions: LLMCompletionOptions & { jsonSchema?: undefined },
  loggingEnabled?: boolean,
): JsonProcessorResult<Record<string, unknown>>;

// Implementation signature - generic to preserve types from validateJsonWithTransforms
// The implementation accepts the base LLMCompletionOptions type
// Type T is inferred from the schema when provided, or defaults to Record<string, unknown>
export function processJson<T = Record<string, unknown>>(
  content: LLMGeneratedContent,
  context: LLMContext,
  completionOptions: LLMCompletionOptions,
  loggingEnabled = true,
): JsonProcessorResult<T> {
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

  // If no schema provided, return parsed data without validation
  if (!completionOptions.jsonSchema) {
    logProcessingSteps(parseResult.steps, parseResult.diagnostics, [], context, loggingEnabled);
    return {
      success: true,
      data: parseResult.data as T,
      mutationSteps: parseResult.steps,
    };
  }

  // Validate the parsed data (with transforms applied internally if needed)
  // Type inference: validateJsonWithTransforms will infer the type from the schema
  // Cast the schema to ZodType<T> to ensure type safety
  const validationResult = validateJsonWithTransforms(
    parseResult.data,
    completionOptions.jsonSchema as z.ZodType<T>,
  );

  // Validation succeeded
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
