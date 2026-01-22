import { z } from "zod";
import {
  LLMContext,
  LLMPurpose,
  LLMCompletionOptions,
  LLMOutputFormat,
} from "../types/llm-request.types";
import type { ResolvedLLMModelMetadata } from "../types/llm-model.types";
import {
  LLMResponseStatus,
  LLMGeneratedContent,
  LLMFunctionResponse,
} from "../types/llm-response.types";
import type { LLMModelKeyFunction, LLMEmbeddingFunction } from "../types/llm-function.types";
import type { LLMErrorMsgRegExPattern } from "../types/llm-stats.types";
import type { LLMProvider } from "../types/llm-provider.interface";
import { ShutdownBehavior } from "../types/llm-shutdown.types";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderSpecificConfig,
  ProviderInit,
} from "./llm-provider.types";
import { formatError } from "../../utils/error-formatters";
import { logWarn } from "../../utils/logging";
import { parseAndValidateLLMJson } from "../json-processing";
import { calculateTokenUsageFromError } from "../utils/error-parser";
import { normalizeTokenUsage } from "../utils/token-usage-normalizer";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";
import { LLMErrorLogger } from "../tracking/llm-error-logger";
import {
  buildModelsMetadataFromChain,
  getCompletionModelKeysFromChain,
  getEmbeddingModelKeysFromChain,
} from "../utils/provider-init-builder";

/**
 * Base class for LLM provider implementations - provides shared functionality and
 * abstract methods to be implemented by concrete provider classes.
 */
export default abstract class BaseLLMProvider implements LLMProvider {
  // Fields
  protected readonly llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  protected readonly providerSpecificConfig: LLMProviderSpecificConfig;
  protected readonly providerParams: Record<string, unknown>;
  private readonly completionModelKeys: readonly string[];
  private readonly embeddingModelKeys: readonly string[];
  private readonly errorPatterns: readonly LLMErrorMsgRegExPattern[];
  private readonly providerFamily: string;
  private readonly errorLogger: LLMErrorLogger;

  /**
   * Constructor accepting a ProviderInit configuration object.
   */
  constructor(init: ProviderInit) {
    const { manifest, providerParams, resolvedModelChain, errorLogging } = init;

    // Build derived values from manifest and resolved model chain
    this.llmModelsMetadata = buildModelsMetadataFromChain(manifest, resolvedModelChain);
    this.completionModelKeys = getCompletionModelKeysFromChain(
      manifest.providerFamily,
      resolvedModelChain,
    );
    this.embeddingModelKeys = getEmbeddingModelKeysFromChain(
      manifest.providerFamily,
      resolvedModelChain,
    );

    // Assign configuration values
    this.errorPatterns = manifest.errorPatterns;
    this.providerSpecificConfig = manifest.providerSpecificConfig;
    this.providerFamily = manifest.providerFamily;
    this.errorLogger = new LLMErrorLogger(errorLogging);
    this.providerParams = providerParams;
  }

  /**
   * Get the models metadata in a readonly format to prevent modifications by the caller.
   * Uses structuredClone for deep immutability.
   */
  getModelsMetadata(): Readonly<Record<string, ResolvedLLMModelMetadata>> {
    return Object.freeze(structuredClone(this.llmModelsMetadata));
  }

  /**
   * Get the model keys available for completion operations.
   */
  getAvailableCompletionModelKeys(): readonly string[] {
    return this.completionModelKeys;
  }

  /**
   * Get the model keys available for embedding operations.
   */
  getAvailableEmbeddingModelKeys(): readonly string[] {
    return this.embeddingModelKeys;
  }

  /**
   * Get the model keys of all available models from this provider.
   */
  getAvailableModelNames(): { embeddings: readonly string[]; completions: readonly string[] } {
    return {
      embeddings: this.embeddingModelKeys,
      completions: this.completionModelKeys,
    };
  }

  /**
   * Get the dimensions for a specific embedding model.
   */
  getEmbeddingModelDimensions(modelKey: string): number | undefined {
    return this.llmModelsMetadata[modelKey].dimensions;
  }

  /**
   * Get the provider family identifier for this LLM provider.
   */
  getProviderFamily(): string {
    return this.providerFamily;
  }

  /**
   * Generate embeddings for the given content using the specified model.
   * Uses arrow function to enable easier binding of `this` context.
   */
  generateEmbeddings: LLMEmbeddingFunction = async (modelKey, content, context, options) => {
    // Validate that the model key is available
    if (!this.embeddingModelKeys.includes(modelKey)) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        `Embedding model '${modelKey}' is not available in provider ${this.providerFamily}. ` +
          `Available: ${this.embeddingModelKeys.join(", ")}`,
      );
    }

    const result = await this.executeProviderFunction<z.ZodType<number[]>>(
      modelKey,
      LLMPurpose.EMBEDDINGS,
      content,
      context,
      options as LLMCompletionOptions<z.ZodType<number[]>>,
    );
    return result;
  };

  /**
   * Execute completion using the specified model.
   * Return type is inferred from options.jsonSchema at the call site.
   * Implemented as arrow function to preserve `this` context when passed to pipeline.
   */
  executeCompletion: LLMModelKeyFunction = async <S extends z.ZodType<unknown>>(
    modelKey: string,
    prompt: string,
    context: LLMContext,
    options?: LLMCompletionOptions<S>,
  ): Promise<LLMFunctionResponse<z.infer<S>>> => {
    // Validate that the model key is available
    if (!this.completionModelKeys.includes(modelKey)) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        `Completion model '${modelKey}' is not available in provider ${this.providerFamily}. ` +
          `Available: ${this.completionModelKeys.join(", ")}`,
      );
    }

    return this.executeProviderFunction(modelKey, LLMPurpose.COMPLETIONS, prompt, context, options);
  };

  /**
   * Close the LLM client.
   */
  async close(): Promise<void> {
    // No-op - default assuming LLM client doesn't provide a close function to call
  }

  /**
   * Get the shutdown behavior for this provider.
   * Default behavior is graceful shutdown - subclasses can override for providers
   * that require special shutdown handling (e.g., Vertex AI with gRPC).
   */
  getShutdownBehavior(): ShutdownBehavior {
    return ShutdownBehavior.GRACEFUL;
  }

  /**
   * Validate provider credentials are available.
   * Default implementation is a no-op. Providers that require credential validation
   * (e.g., AWS Bedrock with SSO) should override this method.
   */
  async validateCredentials(): Promise<void> {
    // No-op default - providers with credential requirements override this
  }

  /**
   * Executes the LLM function for the given model key and task type.
   * Type safety is enforced through generic schema type propagation.
   * Generic over the schema type S directly to simplify type inference.
   * Return type uses z.infer<S> for schema-based type inference.
   */
  private async executeProviderFunction<S extends z.ZodType<unknown>>(
    modelKey: string,
    taskType: LLMPurpose,
    request: string,
    context: LLMContext,
    completionOptions?: LLMCompletionOptions<S>,
    doDebugErrorLogging = false,
  ): Promise<LLMFunctionResponse<z.infer<S>>> {
    const skeletonResponse: Omit<LLMFunctionResponse, "generated" | "status" | "mutationSteps"> = {
      request,
      context,
      modelKey,
    };

    // Default to TEXT mode when no options provided.
    const finalOptions: LLMCompletionOptions<S> =
      completionOptions ??
      ({
        outputFormat: LLMOutputFormat.TEXT,
      } as LLMCompletionOptions<S>);

    try {
      const { isIncompleteResponse, responseContent, tokenUsage } =
        taskType === LLMPurpose.EMBEDDINGS
          ? await this.invokeEmbeddingProvider(modelKey, request)
          : await this.invokeCompletionProvider(modelKey, request, finalOptions);

      if (isIncompleteResponse) {
        return {
          ...skeletonResponse,
          status: LLMResponseStatus.EXCEEDED,
          tokensUsage: normalizeTokenUsage(modelKey, tokenUsage, this.llmModelsMetadata, request),
        };
      } else {
        return await this.formatAndValidateResponse(
          skeletonResponse,
          taskType,
          responseContent,
          finalOptions,
          context,
        );
      }
    } catch (error: unknown) {
      if (this.isLLMOverloaded(error)) {
        return {
          ...skeletonResponse,
          status: LLMResponseStatus.OVERLOADED,
        };
      } else if (this.isTokenLimitExceeded(error)) {
        return {
          ...skeletonResponse,
          status: LLMResponseStatus.EXCEEDED,
          tokensUsage: calculateTokenUsageFromError(
            modelKey,
            request,
            formatError(error),
            this.llmModelsMetadata,
            this.errorPatterns,
          ),
        };
      } else {
        if (doDebugErrorLogging) this.debugUnhandledError(error, modelKey);
        return {
          ...skeletonResponse,
          status: LLMResponseStatus.ERRORED,
          error,
        };
      }
    }
  }

  /**
   * Post-process the LLM response, converting it to JSON if necessary, and build the
   * response metadata object with type-safe JSON validation.
   */
  private async formatAndValidateResponse<S extends z.ZodType<unknown>>(
    skeletonResult: Omit<LLMFunctionResponse, "generated" | "status" | "mutationSteps">,
    taskType: LLMPurpose,
    responseContent: LLMGeneratedContent,
    completionOptions: LLMCompletionOptions<S>,
    context: LLMContext,
  ): Promise<LLMFunctionResponse<z.infer<S>>> {
    // Early return for non-completion tasks
    if (taskType !== LLMPurpose.COMPLETIONS) {
      return {
        ...skeletonResult,
        status: LLMResponseStatus.COMPLETED,
        generated: responseContent,
      };
    }

    // Early return for non-JSON output format (TEXT mode)
    if (completionOptions.outputFormat !== LLMOutputFormat.JSON) {
      return this.validateTextResponse(skeletonResult, responseContent, completionOptions, context);
    }

    // Configuration validation: JSON format requires a jsonSchema.
    if (!completionOptions.jsonSchema) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "Configuration error: outputFormat is JSON but no jsonSchema was provided. " +
          "JSON output requires a schema for type-safe validation.",
      );
    }

    // Process JSON with schema-aware type inference.
    const jsonProcessingResult = parseAndValidateLLMJson(
      responseContent,
      context,
      completionOptions,
      true,
      completionOptions.sanitizerConfig,
    );

    if (jsonProcessingResult.success) {
      return {
        ...skeletonResult,
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
        context,
      );
      return { ...skeletonResult, status: LLMResponseStatus.INVALID, error: parseError };
    }
  }

  /**
   * Validates and formats TEXT output responses.
   */
  private validateTextResponse<S extends z.ZodType<unknown>>(
    skeletonResult: Omit<LLMFunctionResponse, "generated" | "status" | "mutationSteps">,
    responseContent: LLMGeneratedContent,
    completionOptions: LLMCompletionOptions<S>,
    context: LLMContext,
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
      logWarn("LLM returned empty TEXT response", context);
      return {
        ...skeletonResult,
        status: LLMResponseStatus.INVALID,
      };
    }

    return {
      ...skeletonResult,
      status: LLMResponseStatus.COMPLETED,
      generated: responseContent,
    };
  }

  /**
   * Used for debugging purposes - prints the error type and message to the console.
   */
  private debugUnhandledError(error: unknown, modelKey: string) {
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

  /**
   * Invoke the implementation-specific LLM function for embeddings.
   */
  protected abstract invokeEmbeddingProvider(
    modelKey: string,
    prompt: string,
  ): Promise<LLMImplSpecificResponseSummary>;

  /**
   * Invoke the implementation-specific LLM function for completions.
   */
  protected abstract invokeCompletionProvider(
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ): Promise<LLMImplSpecificResponseSummary>;

  /**
   * Is the LLM overloaded?
   */
  protected abstract isLLMOverloaded(error: unknown): boolean;

  /**
   * Is the token limit exceeded?
   */
  protected abstract isTokenLimitExceeded(error: unknown): boolean;
}
