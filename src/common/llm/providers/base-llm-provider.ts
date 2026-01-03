import { z } from "zod";
import {
  LLMModelQuality,
  LLMContext,
  LLMPurpose,
  LLMProvider,
  LLMResponseStatus,
  LLMModelKeysSet,
  LLMFunctionResponse,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
  LLMCompletionOptions,
  LLMResponseTokensUsage,
  LLMGeneratedContent,
  LLMOutputFormat,
  LLMFunction,
  LLMEmbeddingFunction,
  ShutdownBehavior,
} from "../types/llm.types";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderSpecificConfig,
  ProviderInit,
} from "./llm-provider.types";
import { formatError } from "../../utils/error-formatters";
import { processJson } from "../json-processing/core/json-processing";
import { calculateTokenUsageFromError } from "../utils/error-parser";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";
import { llmProviderConfig } from "../config/llm.config";
import type { IErrorLogger } from "../tracking/llm-error-logger.interface";
import {
  buildModelsKeysSet,
  buildModelsMetadataFromResolvedUrns,
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
  private readonly modelsKeys: LLMModelKeysSet;
  private readonly errorPatterns: readonly LLMErrorMsgRegExPattern[];
  private readonly modelFamily: string;
  private readonly errorLogger: IErrorLogger;

  /**
   * Constructor accepting a ProviderInit configuration object.
   */
  constructor(init: ProviderInit) {
    const { manifest, providerParams, resolvedModels, errorLogger } = init;

    // Build derived values from manifest and resolved models
    this.modelsKeys = buildModelsKeysSet(manifest);
    this.llmModelsMetadata = buildModelsMetadataFromResolvedUrns(manifest, resolvedModels);

    // Assign configuration values
    this.errorPatterns = manifest.errorPatterns;
    this.providerSpecificConfig = manifest.providerSpecificConfig;
    this.modelFamily = manifest.providerName;
    this.errorLogger = errorLogger;
    this.providerParams = providerParams;
  }

  /**
   * Get the models metadata in a readonly format to prevent modifications by the caller.
   * Uses structuredClone for deep immutability.
   */
  getModelsMetadata() {
    return Object.freeze(structuredClone(this.llmModelsMetadata));
  }

  /**
   * Get the model key for the embeddings model.
   */
  getAvailableCompletionModelQualities(): LLMModelQuality[] {
    return [
      LLMModelQuality.PRIMARY,
      ...(this.modelsKeys.secondaryCompletionModelKey ? [LLMModelQuality.SECONDARY] : []),
    ];
  }

  /**
   * Get the model key for the embeddings model.
   */
  getModelsNames() {
    const embeddingsMetadata = this.llmModelsMetadata[this.modelsKeys.embeddingsModelKey];
    const primaryCompletionMetadata =
      this.llmModelsMetadata[this.modelsKeys.primaryCompletionModelKey];
    return {
      embeddings: embeddingsMetadata.name,
      primaryCompletion: primaryCompletionMetadata.name,
      ...(this.modelsKeys.secondaryCompletionModelKey && {
        secondaryCompletion:
          this.llmModelsMetadata[this.modelsKeys.secondaryCompletionModelKey].name,
      }),
    };
  }

  /**
   * Get the dimensions for the embeddings model.
   */
  getEmbeddingModelDimensions() {
    return this.llmModelsMetadata[this.modelsKeys.embeddingsModelKey].dimensions;
  }

  /**
   * Get the model family for this LLM provider.
   */
  getModelFamily(): string {
    return this.modelFamily;
  }

  /**
   * Generate embeddings for the given content.
   * Uses arrow function to enable easier binding of `this` context.
   */
  generateEmbeddings: LLMEmbeddingFunction = async (content, context, options) => {
    const result = await this.executeProviderFunction<z.ZodType<number[]>>(
      this.modelsKeys.embeddingsModelKey,
      LLMPurpose.EMBEDDINGS,
      content,
      context,
      options as LLMCompletionOptions<z.ZodType<number[]>>,
    );
    // Return type is correctly inferred as LLMFunctionResponse<number[]> from the generic
    return result;
  };

  /**
   * Execute the LLM function for the primary completion model.
   * Return type is inferred from options.jsonSchema at the call site.
   * Implemented as arrow function to preserve `this` context when passed to pipeline.
   */
  executeCompletionPrimary: LLMFunction = async (prompt, context, options) => {
    return this.executeProviderFunction(
      this.modelsKeys.primaryCompletionModelKey,
      LLMPurpose.COMPLETIONS,
      prompt,
      context,
      options,
    );
  };

  /**
   * Execute the LLM function for the secondary completion model.
   * Return type is inferred from options.jsonSchema at the call site.
   * Implemented as arrow function to preserve `this` context when passed to pipeline.
   */
  executeCompletionSecondary: LLMFunction = async (prompt, context, options) => {
    const secondaryCompletion = this.modelsKeys.secondaryCompletionModelKey;
    if (!secondaryCompletion)
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        `'Secondary' text model for ${this.constructor.name} was not defined`,
      );
    return this.executeProviderFunction(
      secondaryCompletion,
      LLMPurpose.COMPLETIONS,
      prompt,
      context,
      options,
    );
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
   * Used for debugging purposes - prints the error type and message to the console. Set to
   * protected to avoid lint errors saying it is unused.
   */
  protected debugUnhandledError(error: unknown, modelKey: string) {
    if (error instanceof Error) {
      console.log(
        `${error.constructor.name}: ${formatError(error)} - LLM: ${this.llmModelsMetadata[modelKey].urn}`,
      );
    }
  }

  /**
   * Executes the LLM function for the given model key and task type.
   * Type safety is enforced through generic schema type propagation.
   * Generic over the schema type S directly to simplify type inference.
   * Return type uses z.infer<S> for schema-based type inference.
   *
   * The generic constraint `z.ZodType<unknown>` prevents implicit `any` when
   * no schema is provided, ensuring type safety throughout the call chain.
   */
  private async executeProviderFunction<S extends z.ZodType<unknown>>(
    modelKey: string,
    taskType: LLMPurpose,
    request: string,
    context: LLMContext,
    completionOptions?: LLMCompletionOptions<S>,
  ): Promise<LLMFunctionResponse<z.infer<S>>> {
    const skeletonResponse: Omit<LLMFunctionResponse, "generated" | "status" | "mutationSteps"> = {
      request,
      context,
      modelKey,
    };
    const finalOptions =
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
        // Often occurs if combination of prompt + generated completion execeed the max token limit (e.g. actual internal LLM completion has been executed and the completion has been cut short)
        return {
          ...skeletonResponse,
          status: LLMResponseStatus.EXCEEDED,
          tokensUsage: this.extractTokensAmountFromMetadataDefaultingMissingValues(
            modelKey,
            tokenUsage,
            this.llmModelsMetadata,
            request,
          ),
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
      // Explicitly type error as unknown
      // OPTIONAL: this.debugUnhandledError(error, modelKey);

      if (this.isLLMOverloaded(error)) {
        return {
          ...skeletonResponse,
          status: LLMResponseStatus.OVERLOADED,
        };
      } else if (this.isTokenLimitExceeded(error)) {
        // Often occurs if the prompt on its own execeeds the max token limit (e.g. actual internal LLM completion generation was not even initiated by the LLM)
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
        return {
          ...skeletonResponse,
          status: LLMResponseStatus.ERRORED,
          error,
        };
      }
    }
  }

  /**
   * Extract token usage information from LLM response metadata, defaulting missing
   * values.
   */
  private extractTokensAmountFromMetadataDefaultingMissingValues(
    modelKey: string,
    tokenUsage: LLMResponseTokensUsage,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    request: string,
  ): LLMResponseTokensUsage {
    let { promptTokens, completionTokens, maxTotalTokens } = tokenUsage;
    if (completionTokens < 0) completionTokens = 0;
    if (maxTotalTokens < 0) maxTotalTokens = modelsMetadata[modelKey].maxTotalTokens;
    if (promptTokens < 0) {
      const estimatedPromptTokensConsumed = Math.floor(
        request.length / llmProviderConfig.AVERAGE_CHARS_PER_TOKEN,
      );
      promptTokens = Math.max(estimatedPromptTokensConsumed, maxTotalTokens + 1);
    }

    return { promptTokens, completionTokens, maxTotalTokens };
  }

  /**
   * Post-process the LLM response, converting it to JSON if necessary, and build the
   * response metadata object with type-safe JSON validation.
   * Type safety is enforced through generic schema type propagation.
   * Generic over the schema type S directly to simplify type inference.
   * Return type uses z.infer<S> for schema-based type inference.
   *
   * The generic constraint `z.ZodType<unknown>` prevents implicit `any` when
   * no schema is provided, ensuring type safety throughout the call chain.
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
      // Runtime validation: TEXT format must return string.
      // This validates the type before assignment to ensure type safety.
      if (typeof responseContent !== "string") {
        throw new LLMError(
          LLMErrorCode.BAD_RESPONSE_CONTENT,
          `Expected string response for TEXT output format, but received ${typeof responseContent}`,
          responseContent,
        );
      }
      // Type assertion explanation:
      // For TEXT output, the generic S defaults to z.ZodType when no schema is provided,
      // making z.infer<S> resolve to `any`. However, we've validated at runtime that
      // responseContent is a string. The API boundary (LLMRouter.executeCompletion overloads)
      // provides the correct type (string | null) to callers, so this internal `any` is
      // safely bounded and doesn't leak to consumers.
      // See: isTextOptions type guard in llm.types.ts for type-safe narrowing at call sites.
      return {
        ...skeletonResult,
        status: LLMResponseStatus.COMPLETED,
        generated: responseContent,
      };
    }

    // Process JSON with schema-aware type inference.
    // The jsonSchema from completionOptions carries the type information through the chain.
    // With the simplified generic approach using S directly, type inference should work correctly.
    const jsonProcessingResult = processJson(
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
        // Type is correctly inferred through InferResponseType helper
        generated: jsonProcessingResult.data,
        mutationSteps: jsonProcessingResult.mutationSteps,
      };
    } else {
      context.responseContentParseError = formatError(jsonProcessingResult.error);
      await this.errorLogger.recordJsonProcessingError(
        jsonProcessingResult.error,
        responseContent,
        context,
      );
      return { ...skeletonResult, status: LLMResponseStatus.INVALID };
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
