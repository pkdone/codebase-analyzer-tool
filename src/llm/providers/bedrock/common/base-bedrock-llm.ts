import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ServiceUnavailableException,
  ThrottlingException,
  ModelTimeoutException,
  ValidationException,
} from "@aws-sdk/client-bedrock-runtime";
import {
  LLMModelKeysSet,
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
} from "../../../types/llm.types";
import { llmConfig } from "../../../llm.config";
import {
  LLMImplSpecificResponseSummary,
  LLMProviderSpecificConfig,
} from "../../llm-provider.types";
import { formatErrorMessage } from "../../../../common/utils/error-formatters";
import { logErrorMsgAndDetail } from "../../../../common/utils/logging";
import { getNestedValue, getNestedValueWithFallbacks } from "../../../../common/utils/object-utils";
import AbstractLLM from "../../../core/abstract-llm";
import { z } from "zod";
import { BadResponseContentLLMError } from "../../../types/llm-errors.types";

/**
 * Configuration object for Bedrock LLM providers.
 * Encapsulates all Bedrock-specific configuration parameters.
 */
export interface BedrockConfig {
  providerSpecificConfig?: LLMProviderSpecificConfig;
}

/**
 * Configuration for extracting response data from different Bedrock provider response structures
 */
interface ResponsePathConfig {
  /** Path to extract the main response content from the parsed response */
  contentPath: string;
  /** Path to extract the prompt token count */
  promptTokensPath: string;
  /** Path to extract the completion token count */
  completionTokensPath: string;
  /** Path to extract the stop/finish reason */
  stopReasonPath: string;
  /** The stop reason value that indicates the response was truncated due to length limits */
  stopReasonValueForLength: string;
  /** Optional secondary content path (for providers like Deepseek with reasoning_content) */
  alternativeContentPath?: string;
  /** Optional secondary stop reason path (for providers like Mistral with finish_reason) */
  alternativeStopReasonPath?: string;
}

/**
 * Complete configuration for response extraction including schema and provider information
 */
interface ResponseExtractionConfig {
  /** Zod schema to validate the response structure */
  schema: z.ZodType;
  /** Path configuration for extracting data from the response */
  pathConfig: ResponsePathConfig;
  /** Provider name for error messages */
  providerName: string;
}

/**
 * Zod schema for Bedrock embeddings response validation
 */
const BedrockEmbeddingsResponseSchema = z.object({
  embedding: z.array(z.number()).optional(),
  inputTextTokenCount: z.number().optional(),
  results: z
    .array(
      z.object({
        tokenCount: z.number().optional(),
      }),
    )
    .optional(),
});

/**
 * Class for the public AWS Bedrock service (multiple possible LLMs)
 *
 * Some of the possible recevable Bedrock exceptions as of April 2025:
 *
 * BedrockRuntimeClient, InvokeModelCommand, ModelErrorException, ModelStreamErrorException,
 * ResourceNotFoundException, ServiceQuotaExceededException, ServiceUnavailableException,
 * ThrottlingException, ModelNotReadyException, ModelTimeoutException, ValidationException,
 * CredentialsProviderError
 */
export default abstract class BaseBedrockLLM extends AbstractLLM {
  // Private fields
  private readonly client: BedrockRuntimeClient;

  /**
   * Constructor.
   */
  constructor(
    modelsKeys: LLMModelKeysSet,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    config: BedrockConfig,
  ) {
    super(modelsKeys, modelsMetadata, errorPatterns, config.providerSpecificConfig);
    const requestTimeoutMillis =
      config.providerSpecificConfig?.requestTimeoutMillis ??
      llmConfig.DEFAULT_REQUEST_WAIT_TIMEOUT_MILLIS;
    this.client = new BedrockRuntimeClient({
      requestHandler: { requestTimeout: requestTimeoutMillis },
    });
  }

  /**
   * Call close on underlying LLM client library to release resources.
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  override async close() {
    try {
      this.client.destroy();
    } catch (error: unknown) {
      logErrorMsgAndDetail("Error when calling destroy on AWSBedrock LLM", error);
    }
  }

  /**
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   */
  protected async invokeProvider(taskType: LLMPurpose, modelKey: string, prompt: string) {
    const fullParameters = this.buildFullLLMParameters(taskType, modelKey, prompt);
    const command = new InvokeModelCommand(fullParameters);
    const rawResponse = await this.client.send(command);
    const llmResponse: unknown = JSON.parse(
      Buffer.from(rawResponse.body).toString(llmConfig.LLM_UTF8_ENCODING),
    );

    if (taskType === LLMPurpose.EMBEDDINGS) {
      return this.extractEmbeddingModelSpecificResponse(llmResponse);
    } else {
      const config = this.getResponseExtractionConfig();
      return this.extractGenericCompletionResponse(
        llmResponse,
        config.schema,
        config.pathConfig,
        config.providerName,
      );
    }
  }

  /**
   * See if the contents of the responses indicate inability to fully process request due to
   * overloading.
   */
  protected isLLMOverloaded(error: unknown) {
    return (
      error instanceof ThrottlingException ||
      error instanceof ModelTimeoutException ||
      error instanceof ServiceUnavailableException
    );
  }

  /**
   * Check to see if error code indicates potential token limit has been exceeded.
   */
  protected isTokenLimitExceeded(error: unknown): boolean {
    if (!(error instanceof ValidationException)) return false;
    const errorKeywords = [
      "too many input tokens",
      "expected maxlength",
      "input is too long",
      "input length",
      "too large for model",
      "please reduce the length of the prompt",
    ];
    const lowercaseContent = formatErrorMessage(error).toLowerCase();
    return errorKeywords.some((keyword) => lowercaseContent.includes(keyword));
  }

  /**
   * Extract the relevant information from the LLM specific response.
   */
  private extractEmbeddingModelSpecificResponse(llmResponse: unknown) {
    const validation = BedrockEmbeddingsResponseSchema.safeParse(llmResponse);
    if (!validation.success)
      throw new BadResponseContentLLMError(
        "Invalid Bedrock embeddings response structure",
        llmResponse,
      );
    const response = validation.data;
    const responseContent = response.embedding ?? [];
    const isIncompleteResponse = !responseContent; // If no content assume prompt maxed out total tokens available
    const promptTokens = response.inputTextTokenCount ?? -1;
    const completionTokens = response.results?.[0]?.tokenCount ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }

  /**
   * Assemble the AWS Bedrock API parameters structure for embeddings and completions models with
   * the prompt.
   */
  private buildFullLLMParameters(taskType: LLMPurpose, modelKey: string, prompt: string) {
    let body;

    if (taskType === LLMPurpose.EMBEDDINGS) {
      body = JSON.stringify({
        inputText: prompt,
        //dimensions: this.getEmbeddedModelDimensions(),  // Throws error even though Titan Text Embeddings V2 should be able to set dimensions to 56, 512, 1024 according to: https://docs.aws.amazon.com/code-library/latest/ug/bedrock-runtime_example_bedrock-runtime_InvokeModelWithResponseStream_TitanTextEmbeddings_section.html
      });
    } else {
      body = this.buildCompletionModelSpecificParameters(modelKey, prompt);
    }

    return {
      modelId: this.llmModelsMetadata[modelKey].urn,
      contentType: llmConfig.MIME_TYPE_JSON,
      accept: llmConfig.MIME_TYPE_ANY,
      body,
    };
  }

  /**
   * Generic helper function to extract completion response data from various Bedrock provider responses.
   * This eliminates code duplication across different Bedrock provider implementations.
   *
   * @param llmResponse The raw LLM response object
   * @param schema The Zod schema to validate the response structure
   * @param pathConfig Configuration object mapping standard fields to provider-specific response paths
   * @param providerName The name of the provider (for error messages)
   * @returns Standardized LLMImplSpecificResponseSummary object
   */
  private extractGenericCompletionResponse(
    llmResponse: unknown,
    schema: z.ZodType,
    pathConfig: ResponsePathConfig,
    providerName: string,
  ): LLMImplSpecificResponseSummary {
    const validation = schema.safeParse(llmResponse);
    if (!validation.success)
      throw new BadResponseContentLLMError(
        `Invalid ${providerName} response structure`,
        llmResponse,
      );
    const response = validation.data as Record<string, unknown>;
    const contentPaths = [pathConfig.contentPath, pathConfig.alternativeContentPath].filter(
      Boolean,
    ) as string[];
    const responseContent = getNestedValueWithFallbacks<string>(response, contentPaths) ?? "";
    const stopReasonPaths = [
      pathConfig.stopReasonPath,
      pathConfig.alternativeStopReasonPath,
    ].filter(Boolean) as string[];
    const finishReason = getNestedValueWithFallbacks<string>(response, stopReasonPaths) ?? "";
    const finishReasonLowercase = finishReason.toLowerCase();
    const isIncompleteResponse =
      finishReasonLowercase === pathConfig.stopReasonValueForLength.toLowerCase() ||
      !responseContent;
    const promptTokens = getNestedValue<number>(response, pathConfig.promptTokensPath) ?? -1;
    const completionTokens =
      getNestedValue<number>(response, pathConfig.completionTokensPath) ?? -1;
    const maxTotalTokens = -1; // Not using total tokens as that's prompt + completion, not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }

  /**
   * Abstract method to be overriden. Assemble the AWS Bedrock API parameters structure for the
   * specific completions model hosted on Bedroc.
   */
  protected abstract buildCompletionModelSpecificParameters(
    modelKey: string,
    prompt: string,
  ): string;

  /**
   * Abstract method to get the provider-specific response extraction configuration.
   * Each provider implementation should return their schema, path configuration, and provider name.
   */
  protected abstract getResponseExtractionConfig(): ResponseExtractionConfig;
}
