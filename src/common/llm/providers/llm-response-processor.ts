import { z } from "zod";
import {
  LLMExecutionContext,
  LLMPurpose,
  LLMCompletionOptions,
  LLMOutputFormat,
} from "../types/llm-request.types";
import type { ResolvedLLMModelMetadata } from "../types/llm-model.types";
import {
  LLMResponseStatus,
  LLMResponsePayload,
  LLMFunctionResponse,
} from "../types/llm-response.types";
import { formatError } from "../../utils/error-formatters";
import { logWarn } from "../../utils/logging";
import { parseAndValidateLLMJson, repairAndValidateJson } from "../json-processing";
import {
  extractSchemaMetadata,
  schemaMetadataToSanitizerConfig,
} from "../json-processing/utils/zod-schema-metadata";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";
import type { LLMErrorLogger } from "../tracking/llm-error-logger";
import type { LLMSanitizerConfig } from "../config/llm-module-config.types";

/**
 * Base fields common to all LLM response variants.
 * Used as input to response processing methods.
 * Uses LLMExecutionContext because responses are created during execution
 * against a specific model, so modelKey is always known.
 */
export interface ResponseBase {
  readonly request: string;
  readonly context: LLMExecutionContext;
  readonly modelKey: string;
}

/**
 * Dependencies required by the LLM response processor.
 * Passed via constructor for explicit dependency injection without DI framework.
 */
export interface LLMResponseProcessorDeps {
  readonly errorLogger: LLMErrorLogger;
  readonly llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>;
}

/**
 * Service responsible for processing and validating LLM responses.
 *
 * This class handles:
 * - JSON response parsing and validation
 * - TEXT response validation
 * - Error logging for failed JSON processing
 * - Debug logging for unhandled errors
 *
 * Extracted from BaseLLMProvider to improve single responsibility principle (SRP)
 * and enable isolated testing of response processing logic.
 *
 * Note: This class is in src/common/ and must NOT use tsyringe or any DI framework.
 * Dependencies are passed via constructor injection.
 */
export class LLMResponseProcessor {
  private readonly errorLogger: LLMErrorLogger;
  private readonly llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>;

  /**
   * Creates a new LLM response processor.
   *
   * @param deps - Dependencies required for response processing
   */
  constructor(deps: LLMResponseProcessorDeps) {
    this.errorLogger = deps.errorLogger;
    this.llmModelsMetadata = deps.llmModelsMetadata;
  }

  /**
   * Post-process the LLM response, converting it to JSON if necessary, and build the
   * response metadata object with type-safe JSON validation.
   *
   * @param responseBase - Base fields for the response (request, context, modelKey)
   * @param taskType - The type of LLM task (COMPLETIONS or EMBEDDINGS)
   * @param responseContent - The raw content from the LLM
   * @param completionOptions - Options including output format and optional JSON schema
   * @returns A fully typed LLM function response
   */
  async formatAndValidateResponse<S extends z.ZodType<unknown>>(
    responseBase: ResponseBase,
    taskType: LLMPurpose,
    responseContent: LLMResponsePayload,
    completionOptions: LLMCompletionOptions<S>,
  ): Promise<LLMFunctionResponse<z.infer<S>>> {
    // Early return for non-completion tasks
    if (taskType !== LLMPurpose.COMPLETIONS) {
      return {
        ...responseBase,
        status: LLMResponseStatus.COMPLETED,
        // TYPE ASSERTION RATIONALE: For non-completion tasks (embeddings), the type contract
        // is enforced at the call boundary. generateEmbeddings() explicitly binds S to
        // z.ZodType<number[]>, and invokeEmbeddingProvider() implementations return number[]
        // by contract. The generic method cannot know the specific S at compile time, so
        // we cast here to bridge the typed caller with the generic implementation.
        generated: responseContent as z.infer<S>,
      };
    }

    // Early return for non-JSON output format (TEXT mode)
    if (completionOptions.outputFormat !== LLMOutputFormat.JSON) {
      return this.validateTextResponse(responseBase, responseContent, completionOptions);
    }

    // Configuration validation: JSON format requires a jsonSchema.
    if (!completionOptions.jsonSchema) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "Configuration error: outputFormat is JSON but no jsonSchema was provided. " +
          "JSON output requires a schema for type-safe validation.",
      );
    }

    // Handle null response content
    if (responseContent === null) {
      logWarn("LLM returned null response for JSON output format", responseBase.context);
      return {
        ...responseBase,
        status: LLMResponseStatus.INVALID,
        error: "LLM returned null response for JSON output format",
      };
    }

    // Handle pre-parsed object content (some LLM APIs return objects directly in JSON mode).
    // Route directly to validation, bypassing string parsing.
    if (typeof responseContent === "object") {
      return this.validatePreParsedJsonObject(
        responseBase,
        responseContent,
        completionOptions.jsonSchema,
        completionOptions.sanitizerConfig,
      );
    }

    // Handle string content - parse and validate through the standard pipeline.
    const jsonProcessingResult = parseAndValidateLLMJson(
      responseContent,
      responseBase.context,
      completionOptions,
      true,
      completionOptions.sanitizerConfig,
    );

    if (jsonProcessingResult.success) {
      return {
        ...responseBase,
        status: LLMResponseStatus.COMPLETED,
        generated: jsonProcessingResult.data,
        repairs: jsonProcessingResult.repairs,
        pipelineSteps: jsonProcessingResult.pipelineSteps,
      };
    } else {
      const parseError = formatError(jsonProcessingResult.error);
      await this.errorLogger.recordJsonProcessingError(
        jsonProcessingResult.error,
        responseContent,
        responseBase.context,
      );
      return { ...responseBase, status: LLMResponseStatus.INVALID, error: parseError };
    }
  }

  /**
   * Validates and formats TEXT output responses.
   *
   * @param responseBase - Base fields for the response
   * @param responseContent - The raw content from the LLM
   * @param completionOptions - Options including output format
   * @returns A validated TEXT response
   */
  validateTextResponse<S extends z.ZodType<unknown>>(
    responseBase: ResponseBase,
    responseContent: LLMResponsePayload,
    completionOptions: LLMCompletionOptions<S>,
  ): LLMFunctionResponse<z.infer<S>> {
    // Configuration validation: TEXT format should not have a jsonSchema.
    if (completionOptions.jsonSchema !== undefined) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "Configuration error: jsonSchema was provided but outputFormat is TEXT. " +
          "Use outputFormat: LLMOutputFormat.JSON when providing a schema, " +
          "or remove the jsonSchema for TEXT output.",
      );
    }

    // Runtime validation: TEXT format must return string.
    if (typeof responseContent !== "string") {
      throw new LLMError(
        LLMErrorCode.BAD_RESPONSE_CONTENT,
        `Expected string response for TEXT output format, but received ${typeof responseContent}`,
        responseContent,
      );
    }

    // Empty response validation for TEXT format.
    if (!responseContent.trim()) {
      logWarn("LLM returned empty TEXT response", responseBase.context);
      return {
        ...responseBase,
        status: LLMResponseStatus.INVALID,
        error: "LLM returned empty TEXT response",
      };
    }

    return {
      ...responseBase,
      status: LLMResponseStatus.COMPLETED,
      // TYPE ASSERTION RATIONALE: For TEXT output format, the runtime validation above
      // confirms responseContent is a string, and the configuration validation ensures
      // callers cannot provide a jsonSchema with TEXT mode. When no schema is provided,
      // S defaults to z.ZodType<unknown>, making z.infer<S> resolve to unknown. String is
      // assignable to unknown, making this cast safe. Callers expecting typed JSON must use
      // JSON output format with a schema.
      generated: responseContent as z.infer<S>,
    };
  }

  /**
   * Used for debugging purposes - prints the error type and message to the console.
   *
   * @param error - The error that occurred
   * @param modelKey - The model key that experienced the error
   */
  debugUnhandledError(error: unknown, modelKey: string): void {
    const urn = this.llmModelsMetadata[modelKey].urn;
    const details = formatError(error);

    if (error instanceof Error) {
      console.log(
        `[DEBUG] Error Name: ${error.name}, Constructor: ${error.constructor.name}, ` +
          `Details: ${details}, URN: ${urn}`,
      );
    } else {
      console.log(`[DEBUG] Non-Error type: ${typeof error}, Details: ${details}, URN: ${urn}`);
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Validates a pre-parsed JSON object against the provided schema.
   *
   * This method handles the case where an LLM API returns a parsed JSON object
   * directly (e.g., via native JSON mode) rather than a string. It bypasses
   * the parsing/sanitization pipeline and routes directly to validation.
   *
   * @param responseBase - Base fields for the response
   * @param content - The pre-parsed JSON object to validate
   * @param jsonSchema - The Zod schema to validate against
   * @param sanitizerConfig - Optional sanitizer configuration for transforms
   * @returns A validated JSON response or an error response
   */
  private validatePreParsedJsonObject<S extends z.ZodType<unknown>>(
    responseBase: ResponseBase,
    content: object,
    jsonSchema: S,
    sanitizerConfig?: LLMSanitizerConfig,
  ): LLMFunctionResponse<z.infer<S>> {
    // Build effective sanitizer config from schema metadata
    const effectiveConfig = this.buildEffectiveSanitizerConfig(jsonSchema, sanitizerConfig);

    // Validate directly using repairAndValidateJson (skips parsing)
    const validationResult = repairAndValidateJson(content, jsonSchema, effectiveConfig);

    if (validationResult.success) {
      return {
        ...responseBase,
        status: LLMResponseStatus.COMPLETED,
        generated: validationResult.data,
        repairs: [...validationResult.transformRepairs],
        pipelineSteps: ["Pre-parsed object (skipped string parsing)"],
      };
    }

    // Validation failed
    const validationError = new Error(
      `Schema validation failed for pre-parsed object: ${JSON.stringify(validationResult.issues)}`,
    );
    logWarn("Pre-parsed JSON object failed schema validation", {
      ...responseBase.context,
      issues: validationResult.issues,
      appliedTransforms: validationResult.transformRepairs.join(", "),
    });
    return {
      ...responseBase,
      status: LLMResponseStatus.INVALID,
      error: formatError(validationError),
    };
  }

  /**
   * Builds the effective sanitizer configuration by combining schema metadata
   * with explicit configuration.
   *
   * @param jsonSchema - The Zod schema to extract metadata from
   * @param explicitConfig - Optional explicit configuration to merge
   * @returns The effective sanitizer configuration
   */
  private buildEffectiveSanitizerConfig(
    jsonSchema: z.ZodType<unknown>,
    explicitConfig?: LLMSanitizerConfig,
  ): LLMSanitizerConfig | undefined {
    const schemaMetadata = extractSchemaMetadata(jsonSchema);
    if (schemaMetadata.allProperties.length === 0 && !explicitConfig) return undefined;
    return schemaMetadataToSanitizerConfig(schemaMetadata, explicitConfig);
  }
}
