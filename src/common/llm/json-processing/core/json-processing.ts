import { z } from "zod";
import { LLMGeneratedContent, LLMCompletionOptions, LLMContext } from "../../types/llm.types";
import { JsonProcessingError, JsonProcessingErrorType } from "../types/json-processing.errors";
import { JsonProcessorResult } from "../types/json-processing-result.types";
import { logWarn } from "../../../utils/logging";
import { hasSignificantMutationSteps } from "../sanitizers";
import { parseJsonWithSanitizers } from "./json-parsing";
import { validateJsonWithTransforms } from "./json-validating";
import {
  extractSchemaMetadata,
  schemaMetadataToSanitizerConfig,
} from "../utils/zod-schema-metadata";
import type { LLMSanitizerConfig } from "../../config/llm-module-config.types";

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
    logWarn(message, context);
  }
}

/**
 * Logs mutation steps if enabled and significant.
 *
 * Only logs if there are significant mutations (i.e., not just trivial formatting like
 * whitespace trimming or code fence removal).
 *
 * @param mutationSteps - The mutation steps that were applied (diagnostics + transforms)
 * @param context - LLM context for log attribution
 * @param loggingEnabled - Whether logging is enabled
 */
function logProcessingSteps(
  mutationSteps: readonly string[],
  context: LLMContext,
  loggingEnabled: boolean,
): void {
  if (!loggingEnabled) return;

  // Only log if there are significant mutations
  if (!hasSignificantMutationSteps(mutationSteps)) return;

  if (mutationSteps.length > 0) {
    logWarn(`Applied ${mutationSteps.length} JSON fix(es): ${mutationSteps.join(", ")}`, context);
  }
}

/**
 * Builds the effective sanitizer configuration by combining:
 * 1. Dynamic metadata extracted from the provided Zod schema (if available)
 * 2. Explicit configuration passed by the caller (takes precedence)
 *
 * This enables schema-agnostic sanitization where property lists are derived
 * from the actual schema being validated, reducing the need for hardcoded lists.
 *
 * @param jsonSchema - Optional Zod schema to extract metadata from
 * @param explicitConfig - Optional explicit configuration to merge with schema metadata
 * @returns The effective sanitizer configuration, or undefined if neither source provides data
 */
function buildEffectiveSanitizerConfig(
  jsonSchema: z.ZodType | undefined,
  explicitConfig: LLMSanitizerConfig | undefined,
): LLMSanitizerConfig | undefined {
  // If no schema, just return the explicit config (may be undefined)
  if (!jsonSchema) {
    return explicitConfig;
  }

  // Extract metadata from the schema
  const schemaMetadata = extractSchemaMetadata(jsonSchema);

  // If schema extraction yielded no properties and no explicit config, return undefined
  if (schemaMetadata.allProperties.length === 0 && !explicitConfig) {
    return undefined;
  }

  // Merge schema metadata with explicit config (explicit config takes precedence)
  return schemaMetadataToSanitizerConfig(schemaMetadata, explicitConfig);
}

/**
 * Parses and validates LLM-generated content through a multi-stage sanitization and repair pipeline,
 * then validates it against a Zod schema. Returns a result object indicating success or failure.
 *
 * This is the high-level public API for LLM JSON processing, orchestrating parsing and validation
 * with comprehensive logging. The function handles:
 * 1. Sanitization of raw LLM text (removes markdown, comments)
 * 2. JSON parsing with error recovery
 * 3. Schema validation against the provided Zod schema
 * 4. Schema-fixing transforms (coercion)
 *
 * The function is generic over the schema type, enabling type-safe validation:
 * - When a schema is provided, returns z.infer<S> where S is the schema type
 * - When no schema is provided, returns Record<string, unknown>
 *
 * @template S - The Zod schema type. When provided, the return type is inferred from the schema.
 * @param content - The LLM-generated content to parse and validate
 * @param context - Context information about the LLM request
 * @param completionOptions - Options including output format and optional JSON schema
 * @param loggingEnabled - Whether to enable sanitization step logging. Defaults to true.
 * @param config - Optional sanitizer configuration to pass to transforms
 * @returns A JsonProcessorResult indicating success with validated data and steps, or failure with an error
 */
export function parseAndValidateLLMJson<S extends z.ZodType = z.ZodType<Record<string, unknown>>>(
  content: LLMGeneratedContent,
  context: LLMContext,
  completionOptions: LLMCompletionOptions<S>,
  loggingEnabled = true,
  config?: LLMSanitizerConfig,
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
        lastSanitizer: parseResult.steps.at(-1),
        diagnosticsCount: parseResult.diagnostics.length,
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
  // The default return type is Record<string, unknown>, which is a pragmatic default
  // for the common case where parsed JSON is an object.
  if (!jsonSchema) {
    // Type guard ensures the data is an object or array (not a primitive or null).
    // Note: typeof returns "object" for both objects AND arrays, so arrays pass this check.
    // However, the return type Record<string, unknown> does not accurately represent arrays.
    // Callers expecting array responses should provide an explicit schema for proper typing.
    if (typeof parseResult.data !== "object" || parseResult.data === null) {
      return {
        success: false,
        error: createParseError(
          "expected a JSON object or array but received a primitive type or null",
          context,
        ),
      };
    }
    // Build mutation steps from diagnostics (no transforms when no schema)
    const mutationSteps = parseResult.diagnostics;
    logProcessingSteps(mutationSteps, context, loggingEnabled);
    return {
      success: true,
      // Cast is safe for objects. Arrays pass at runtime but callers expecting arrays
      // should provide an explicit schema for compile-time type safety.
      data: parseResult.data as z.infer<S>,
      mutationSteps,
      appliedSanitizers: parseResult.steps,
    };
  }

  // TypeScript now knows jsonSchema exists and is a z.ZodType.
  // Build effective config by combining schema metadata with any explicit config.
  // This enables dynamic property detection based on the actual schema being validated.
  const effectiveConfig = buildEffectiveSanitizerConfig(jsonSchema, config);

  // Validate the parsed data (with transforms applied internally if needed).
  const validationResult = validateJsonWithTransforms(
    parseResult.data,
    jsonSchema,
    effectiveConfig,
  );

  // Validation succeeded.
  if (validationResult.success) {
    // Build mutation steps from diagnostics + transform steps
    const mutationSteps = [...parseResult.diagnostics, ...validationResult.transformSteps];
    logProcessingSteps(mutationSteps, context, loggingEnabled);
    return {
      success: true,
      data: validationResult.data,
      mutationSteps,
      appliedSanitizers: parseResult.steps,
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
