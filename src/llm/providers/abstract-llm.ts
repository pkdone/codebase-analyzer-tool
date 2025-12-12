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
} from "../types/llm.types";
import { LLMImplSpecificResponseSummary, LLMProviderSpecificConfig } from "./llm-provider.types";
import { formatError } from "../../common/utils/error-formatters";
import { processJson } from "../json-processing/core/json-processing";
import { calculateTokenUsageFromError } from "../utils/error-parser";
import { BadConfigurationLLMError } from "../types/llm-errors.types";
import { llmProviderConfig } from "../llm.config";
import { LLMErrorLogger } from "../tracking/llm-error-logger";
import { z } from "zod";

/**
 * Abstract class for any LLM provider services - provides outline of abstract methods to be
 * implemented by an extended class that implements a specific LLM integration.
 */
export default abstract class AbstractLLM implements LLMProvider {
  // Fields
  /** Optional feature flags propagated from manifest (if any) */
  readonly llmFeatures?: readonly string[];
  protected readonly llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  protected readonly providerSpecificConfig: LLMProviderSpecificConfig;
  private readonly modelsKeys: LLMModelKeysSet;
  private readonly errorPatterns: readonly LLMErrorMsgRegExPattern[];
  private readonly modelFamily: string;
  private readonly errorLogger: LLMErrorLogger;

  /**
   * Constructor.
   */
  constructor(
    modelsKeys: LLMModelKeysSet,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    providerSpecificConfig: LLMProviderSpecificConfig,
    modelFamily: string,
    errorLogger: LLMErrorLogger,
    llmFeatures?: readonly string[],
  ) {
    this.modelsKeys = modelsKeys;
    this.llmModelsMetadata = modelsMetadata;
    this.errorPatterns = errorPatterns;
    this.providerSpecificConfig = providerSpecificConfig;
    this.modelFamily = modelFamily;
    this.errorLogger = errorLogger;
    this.llmFeatures = llmFeatures;
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
    return {
      embeddings: this.llmModelsMetadata[this.modelsKeys.embeddingsModelKey].urn,
      primaryCompletion: this.llmModelsMetadata[this.modelsKeys.primaryCompletionModelKey].urn,
      ...(this.modelsKeys.secondaryCompletionModelKey && {
        secondaryCompletion:
          this.llmModelsMetadata[this.modelsKeys.secondaryCompletionModelKey].urn,
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
  generateEmbeddings = async (
    content: string,
    context: LLMContext,
    options?: LLMCompletionOptions,
  ): Promise<LLMFunctionResponse<number[]>> => {
    return this.executeProviderFunction<number[]>(
      this.modelsKeys.embeddingsModelKey,
      LLMPurpose.EMBEDDINGS,
      content,
      context,
      options,
    );
  };

  /**
   * Execute the LLM function for the primary completion model with type-safe JSON validation.
   * The generic type parameter T represents the expected return type, which should
   * match the Zod schema provided in the completion options.
   * Callers must explicitly provide the type parameter T.
   */
  async executeCompletionPrimary<T>(
    prompt: string,
    context: LLMContext,
    options?: LLMCompletionOptions,
  ): Promise<LLMFunctionResponse<T>> {
    return this.executeProviderFunction<T>(
      this.modelsKeys.primaryCompletionModelKey,
      LLMPurpose.COMPLETIONS,
      prompt,
      context,
      options,
    );
  }

  /**
   * Execute the LLM function for the secondary completion model with type-safe JSON validation.
   * The generic type parameter T represents the expected return type, which should
   * match the Zod schema provided in the completion options.
   * Callers must explicitly provide the type parameter T.
   */
  async executeCompletionSecondary<T>(
    prompt: string,
    context: LLMContext,
    options?: LLMCompletionOptions,
  ): Promise<LLMFunctionResponse<T>> {
    const secondaryCompletion = this.modelsKeys.secondaryCompletionModelKey;
    if (!secondaryCompletion)
      throw new BadConfigurationLLMError(
        `'Secondary' text model for ${this.constructor.name} was not defined`,
      );
    return this.executeProviderFunction<T>(
      secondaryCompletion,
      LLMPurpose.COMPLETIONS,
      prompt,
      context,
      options,
    );
  }

  /**
   * Close the LLM client.
   */
  async close(): Promise<void> {
    // No-op - default assuming LLM client doesn't provide a close function to call
  }

  /**
   * Whether the LLM provider needs to be forcefully shut down.
   */
  needsForcedShutdown(): boolean {
    return false;
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
   * Executes the LLM function for the given model key and task type with type-safe JSON validation.
   * The generic type parameter T represents the expected return type, which should
   * match the Zod schema provided in the completion options.
   * Callers must explicitly provide the type parameter T.
   */
  private async executeProviderFunction<T>(
    modelKey: string,
    taskType: LLMPurpose,
    request: string,
    context: LLMContext,
    completionOptions?: LLMCompletionOptions,
  ): Promise<LLMFunctionResponse<T>> {
    const skeletonResponse: Omit<
      LLMFunctionResponse<T>,
      "generated" | "status" | "mutationSteps"
    > = { request, context, modelKey };
    completionOptions ??= { outputFormat: LLMOutputFormat.TEXT };

    try {
      const { isIncompleteResponse, responseContent, tokenUsage } = await this.invokeProvider(
        taskType,
        modelKey,
        request,
        completionOptions,
      );

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
        } as LLMFunctionResponse<T>;
      } else {
        return await this.formatAndValidateResponse<T>(
          skeletonResponse,
          taskType,
          responseContent,
          completionOptions,
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
        } as LLMFunctionResponse<T>;
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
        } as LLMFunctionResponse<T>;
      } else {
        return {
          ...skeletonResponse,
          status: LLMResponseStatus.ERRORED,
          error,
        } as LLMFunctionResponse<T>;
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
   * The generic type parameter T represents the expected return type, which is inferred
   * from the Zod schema when JSON validation is used.
   */
  private async formatAndValidateResponse<T = LLMGeneratedContent>(
    skeletonResult: Omit<LLMFunctionResponse<T>, "generated" | "status" | "mutationSteps">,
    taskType: LLMPurpose,
    responseContent: LLMGeneratedContent,
    completionOptions: LLMCompletionOptions,
    context: LLMContext,
  ): Promise<LLMFunctionResponse<T>> {
    // Early return for non-completion tasks
    if (taskType !== LLMPurpose.COMPLETIONS) {
      return {
        ...skeletonResult,
        status: LLMResponseStatus.COMPLETED,
        generated: responseContent as T,
      };
    }

    // Early return for non-JSON output format
    if (completionOptions.outputFormat !== LLMOutputFormat.JSON) {
      return {
        ...skeletonResult,
        status: LLMResponseStatus.COMPLETED,
        generated: responseContent as T,
      };
    }

    // Process JSON with type-safe overload resolution
    // Use conditional logic to help TypeScript select the correct overload
    // When jsonSchema is present, use the first overload; otherwise use the second
    const jsonProcessingResult = completionOptions.jsonSchema
      ? processJson(
          responseContent,
          context,
          {
            ...completionOptions,
            jsonSchema: completionOptions.jsonSchema,
          } as LLMCompletionOptions & { jsonSchema: z.ZodType },
          true,
        )
      : processJson(
          responseContent,
          context,
          { ...completionOptions, jsonSchema: undefined } as LLMCompletionOptions & {
            jsonSchema?: undefined;
          },
          true,
        );

    if (jsonProcessingResult.success) {
      // The data property is now strongly typed based on the schema provided
      // in completionOptions. The cast to T is an assertion from the inferred type to T,
      // which is what the caller expects.
      return {
        ...skeletonResult,
        status: LLMResponseStatus.COMPLETED,
        generated: jsonProcessingResult.data as T,
        mutationSteps: jsonProcessingResult.mutationSteps,
      };
    } else {
      context.responseContentParseError = formatError(jsonProcessingResult.error);
      await this.errorLogger.recordJsonProcessingError(
        jsonProcessingResult.error,
        responseContent,
        context,
      );
      return { ...skeletonResult, status: LLMResponseStatus.INVALID } as LLMFunctionResponse<T>;
    }
  }

  /**
   * Invoke the implementation-specific LLM function.
   */
  protected abstract invokeProvider(
    taskType: LLMPurpose,
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
