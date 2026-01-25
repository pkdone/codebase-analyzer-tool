import { z } from "zod";
import { LLMGeneratedContent } from "../../types/llm-response.types";
import { LLMCompletionOptions, LLMContext } from "../../types/llm-request.types";
import { JsonProcessingError, JsonProcessingErrorType } from "../types/json-processing.errors";
import { JsonProcessorResult } from "../types/json-processing-result.types";
import { logWarn } from "../../../utils/logging";
import { hasSignificantRepairs } from "../utils/repair-analysis";
import { parseJsonWithSanitizers, type ParseResult } from "./json-parsing";
import { repairAndValidateJson } from "./json-validating";
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
  return content.includes("{") || content.includes("[");
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
 * Logs repairs if enabled and significant.
 *
 * Only logs if there are significant repairs (i.e., not just trivial formatting like
 * whitespace trimming or code fence removal).
 *
 * @param repairs - The repairs that were applied (sanitization + transform repairs)
 * @param context - LLM context for log attribution
 * @param loggingEnabled - Whether logging is enabled
 */
function logRepairs(
  repairs: readonly string[],
  context: LLMContext,
  loggingEnabled: boolean,
): void {
  if (!loggingEnabled) return;

  // Only log if there are significant repairs
  if (!hasSignificantRepairs(repairs)) return;

  if (repairs.length > 0) {
    logWarn(`Applied ${repairs.length} JSON fix(es): ${repairs.join(", ")}`, context);
  }
}

/** Result type for input validation. */
type ContentValidationResult =
  | { success: true; trimmedContent: string }
  | { success: false; error: JsonProcessingError };

/**
 * Validates the raw LLM content before JSON parsing.
 * Checks that content is a non-empty string with JSON-like structure.
 *
 * @param content - The LLM-generated content to validate
 * @param context - Context information about the LLM request
 * @param loggingEnabled - Whether to enable logging for validation issues
 * @returns A result with trimmed content on success, or an error on failure
 */
function validateContentInput(
  content: LLMGeneratedContent,
  context: LLMContext,
  loggingEnabled: boolean,
): ContentValidationResult {
  if (typeof content !== "string") {
    logProblem(
      `LLM response is not a string. Content: ${JSON.stringify(content).substring(0, 100)}`,
      context,
      loggingEnabled,
    );
    return { success: false, error: createParseError("is not a string", context) };
  }

  // ES2023: Check for malformed Unicode (lone surrogates) which can occur in
  // truncated LLM streaming responses or encoding issues
  if (!content.isWellFormed()) {
    logProblem(
      `LLM response contains malformed Unicode (lone surrogates)`,
      { ...context, contentLength: content.length },
      loggingEnabled,
    );
    return { success: false, error: createParseError("contains malformed Unicode", context) };
  }

  const trimmedContent = content.trim();

  if (!content) {
    logProblem(`LLM response is just an empty string`, context, loggingEnabled);
    return { success: false, error: createParseError("is just an empty string", context) };
  }

  // Early detection: Check if content has any JSON-like structure at all
  if (!hasJsonLikeStructure(trimmedContent)) {
    logProblem(
      `Contains no JSON structure (no objects or arrays) and appears to be plain text.`,
      { ...context, contentLength: trimmedContent.length },
      loggingEnabled,
    );
    return {
      success: false,
      error: createParseError("contains no JSON structure and appears to be plain text", context),
    };
  }

  return { success: true, trimmedContent };
}

/** Type alias for a successful parse result. */
type SuccessfulParseResult = Extract<ParseResult, { success: true }>;

/**
 * Builds the result for schema-less JSON parsing (when no jsonSchema is provided).
 * Validates that the parsed data is an object or array, then constructs the success result.
 *
 * TYPE SAFETY NOTE:
 * This function is only called when `completionOptions.jsonSchema` is undefined.
 * In that case, the generic S defaults to `z.ZodType<unknown>` (from parseAndValidateLLMJson's
 * default type parameter), making `z.infer<S>` resolve to `unknown`. This forces callers
 * to explicitly handle the untyped data or cast it themselves.
 *
 * The cast to `z.infer<S>` is safe because:
 * 1. When S defaults to `z.ZodType<unknown>`, the return type is `JsonProcessorResult<unknown>`
 * 2. The runtime value (object or array) is assignable to `unknown`
 * 3. Callers providing an explicit S without a schema are violating the API contract
 *    (enforced at the provider level by BaseLLMProvider throwing BAD_CONFIGURATION error)
 *
 * @param parseResult - The successful parse result from the sanitization pipeline
 * @param context - Context information about the LLM request
 * @param loggingEnabled - Whether to enable repair logging
 * @returns A JsonProcessorResult with the parsed data (typed as unknown) or an error
 */
function buildSchemalessResult<S extends z.ZodType<unknown>>(
  parseResult: SuccessfulParseResult,
  context: LLMContext,
  loggingEnabled: boolean,
): JsonProcessorResult<z.infer<S>> {
  // Type guard ensures the data is an object or array (not a primitive or null).
  // Note: typeof returns "object" for both objects AND arrays, so arrays pass this check.
  if (typeof parseResult.data !== "object" || parseResult.data === null) {
    return {
      success: false,
      error: createParseError(
        "expected a JSON object or array but received a primitive type or null",
        context,
      ),
    };
  }
  // Build repairs from parse repairs (no transforms when no schema)
  const repairs = parseResult.repairs;
  logRepairs(repairs, context, loggingEnabled);
  return {
    success: true,
    // TYPE ASSERTION RATIONALE: See function JSDoc for type safety explanation.
    // When no schema is provided, S defaults to z.ZodType<unknown>, making this cast to `unknown`.
    data: parseResult.data as z.infer<S>,
    repairs,
    pipelineSteps: parseResult.pipelineSteps,
  };
}

/**
 * Validates parsed JSON data against a Zod schema with transforms and builds the result.
 * Handles both successful validation and validation failures after transform attempts.
 *
 * @param parseResult - The successful parse result from the sanitization pipeline
 * @param jsonSchema - The Zod schema to validate against
 * @param context - Context information about the LLM request
 * @param loggingEnabled - Whether to enable repair logging
 * @param config - Optional sanitizer configuration to pass to transforms
 * @returns A JsonProcessorResult with validated data or a validation error
 */
function validateAndBuildResult<S extends z.ZodType<unknown>>(
  parseResult: SuccessfulParseResult,
  jsonSchema: S,
  context: LLMContext,
  loggingEnabled: boolean,
  config?: LLMSanitizerConfig,
): JsonProcessorResult<z.infer<S>> {
  const effectiveConfig = buildEffectiveSanitizerConfig(jsonSchema, config);
  const validationResult = repairAndValidateJson(parseResult.data, jsonSchema, effectiveConfig);

  // Validation succeeded.
  if (validationResult.success) {
    // Build repairs from parse repairs + transform repairs
    const repairs = [...parseResult.repairs, ...validationResult.transformRepairs];
    logRepairs(repairs, context, loggingEnabled);
    return {
      success: true,
      data: validationResult.data,
      repairs,
      pipelineSteps: parseResult.pipelineSteps,
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
      appliedTransforms: validationResult.transformRepairs.join(", "),
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
  if (!jsonSchema) return explicitConfig;
  const schemaMetadata = extractSchemaMetadata(jsonSchema);
  if (schemaMetadata.allProperties.length === 0 && !explicitConfig) return undefined;
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
 * Type safety behavior:
 * - When jsonSchema is provided, the return type is inferred from the schema (z.infer<S>)
 * - When jsonSchema is not provided, the generic S defaults to z.ZodType<unknown>, making
 *   z.infer<S> resolve to `unknown`. This forces callers to handle the untyped data explicitly.
 *
 * Note: For enforced type safety at the API boundary, callers should use BaseLLMProvider
 * which validates that JSON output format requires a schema, preventing schema-less JSON
 * processing at the provider level.
 *
 * @template S - The Zod schema type. When provided, the return type is inferred from the schema.
 *               When not provided, defaults to z.ZodType<unknown> for type-safe handling.
 * @param content - The LLM-generated content to parse and validate
 * @param context - Context information about the LLM request
 * @param completionOptions - Options including output format and optional JSON schema
 * @param loggingEnabled - Whether to enable sanitization step logging. Defaults to true.
 * @param config - Optional sanitizer configuration to pass to transforms
 * @returns A JsonProcessorResult indicating success with validated data and repairs, or failure with an error
 */
export function parseAndValidateLLMJson<S extends z.ZodType = z.ZodType<unknown>>(
  content: LLMGeneratedContent,
  context: LLMContext,
  completionOptions: LLMCompletionOptions<S>,
  loggingEnabled = true,
  config?: LLMSanitizerConfig,
): JsonProcessorResult<z.infer<S>> {
  // Step 1: Validate input content (string type, non-empty, has JSON structure)
  const inputResult = validateContentInput(content, context, loggingEnabled);
  if (!inputResult.success) return inputResult;

  // Step 2: Parse JSON content (with sanitizers applied internally)
  const parseResult = parseJsonWithSanitizers(inputResult.trimmedContent);

  if (!parseResult.success) {
    const pipelineMessage =
      parseResult.pipelineSteps.length > 0
        ? `Applied sanitization steps: ${parseResult.pipelineSteps.join(" -> ")}`
        : "No sanitization steps applied";
    logProblem(
      `Cannot parse JSON after all sanitization attempts. ${pipelineMessage}`,
      {
        ...context,
        originalLength: inputResult.trimmedContent.length,
        lastSanitizer: parseResult.pipelineSteps.at(-1),
        repairsCount: parseResult.repairs.length,
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

  // Step 3: Branch based on schema presence
  const { jsonSchema } = completionOptions;
  if (!jsonSchema) return buildSchemalessResult<S>(parseResult, context, loggingEnabled);

  // Step 4: Validate against schema and build result
  return validateAndBuildResult(parseResult, jsonSchema, context, loggingEnabled, config);
}
