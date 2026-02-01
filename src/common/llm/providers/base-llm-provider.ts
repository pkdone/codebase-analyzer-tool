import { z } from "zod";
import { LLMContext, LLMPurpose, LLMCompletionOptions, LLMOutputFormat } from "../types/llm-request.types";
import type { ResolvedLLMModelMetadata } from "../types/llm-model.types";
import { LLMResponseStatus, LLMFunctionResponse } from "../types/llm-response.types";
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
import { calculateTokenUsageFromError } from "../utils/error-parser";
import { normalizeTokenUsage } from "../utils/token-usage-normalizer";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";
import { LLMErrorLogger } from "../tracking/llm-error-logger";
import {
  buildModelsMetadataFromChain,
  getCompletionModelKeysFromChain,
  getEmbeddingModelKeysFromChain,
} from "../utils/provider-init-builder";
import { LLMResponseProcessor } from "./llm-response-processor";

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
  private readonly responseProcessor: LLMResponseProcessor;

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
    this.providerParams = providerParams;

    // Initialize response processor with required dependencies
    this.responseProcessor = new LLMResponseProcessor({
      errorLogger: new LLMErrorLogger(errorLogging),
      llmModelsMetadata: this.llmModelsMetadata,
    });
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
    // Base fields common to all response variants
    const responseBase = {
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
          ...responseBase,
          status: LLMResponseStatus.EXCEEDED,
          tokensUsage: normalizeTokenUsage(modelKey, tokenUsage, this.llmModelsMetadata, request),
        };
      } else {
        // Delegate response processing to the dedicated processor
        return await this.responseProcessor.formatAndValidateResponse(
          responseBase,
          taskType,
          responseContent,
          finalOptions,
        );
      }
    } catch (error: unknown) {
      if (this.isLLMOverloaded(error)) {
        return {
          ...responseBase,
          status: LLMResponseStatus.OVERLOADED,
        };
      } else if (this.isTokenLimitExceeded(error)) {
        return {
          ...responseBase,
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
        if (doDebugErrorLogging) this.responseProcessor.debugUnhandledError(error, modelKey);
        return {
          ...responseBase,
          status: LLMResponseStatus.ERRORED,
          error,
        };
      }
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
