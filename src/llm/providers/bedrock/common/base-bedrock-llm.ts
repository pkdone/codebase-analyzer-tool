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
import { appConfig } from "../../../../config/app.config";
import { LLMProviderSpecificConfig } from "../../llm-provider.types";
import { formatError } from "../../../../common/utils/error-formatters";
import { logErrorMsgAndDetail } from "../../../../common/utils/logging";
import AbstractLLM from "../../abstract-llm";
import { z } from "zod";
import { BadResponseContentLLMError } from "../../../types/llm-errors.types";
import {
  extractGenericCompletionResponse,
  type ResponsePathConfig,
} from "./bedrock-response-parser";
import { JsonProcessor } from "../../../json-processing/core/json-processor";

/**
 * Configuration object for Bedrock LLM providers.
 * Encapsulates all Bedrock-specific configuration parameters.
 */
export interface BedrockConfig {
  providerSpecificConfig?: LLMProviderSpecificConfig;
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
    jsonProcessor: JsonProcessor,
  ) {
    if (!config.providerSpecificConfig) {
      throw new Error("providerSpecificConfig is required but was not provided");
    }
    super(modelsKeys, modelsMetadata, errorPatterns, config.providerSpecificConfig, jsonProcessor);
    const requestTimeoutMillis = config.providerSpecificConfig.requestTimeoutMillis;
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
    return taskType === LLMPurpose.EMBEDDINGS
      ? this.invokeEmbeddings(modelKey, prompt)
      : this.invokeCompletion(modelKey, prompt);
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
   * Type guard that narrows the error type to ValidationException when true.
   */
  protected isTokenLimitExceeded(error: unknown): error is ValidationException {
    if (!(error instanceof ValidationException)) return false;
    const errorKeywords = [
      "too many input tokens",
      "expected maxlength",
      "input is too long",
      "input length",
      "too large for model",
      "please reduce the length of the prompt",
    ];
    const lowercaseContent = formatError(error).toLowerCase();
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
  private buildEmbeddingParameters(modelKey: string, prompt: string) {
    const bodyObj = { inputText: prompt };
    return {
      modelId: this.llmModelsMetadata[modelKey].urn,
      contentType: appConfig.MIME_TYPE_JSON,
      accept: appConfig.MIME_TYPE_ANY,
      body: JSON.stringify(bodyObj),
    };
  }

  private buildCompletionParameters(modelKey: string, prompt: string) {
    const bodyObj = this.buildCompletionRequestBody(modelKey, prompt);
    return {
      modelId: this.llmModelsMetadata[modelKey].urn,
      contentType: appConfig.MIME_TYPE_JSON,
      accept: appConfig.MIME_TYPE_ANY,
      body: JSON.stringify(bodyObj),
    };
  }

  private async invokeEmbeddings(modelKey: string, prompt: string) {
    const parameters = this.buildEmbeddingParameters(modelKey, prompt);
    const command = new InvokeModelCommand(parameters);
    const rawResponse = await this.client.send(command);
    const jsonString = new TextDecoder(appConfig.UTF8_ENCODING).decode(rawResponse.body);
    const llmResponse: unknown = JSON.parse(jsonString);
    return this.extractEmbeddingModelSpecificResponse(llmResponse);
  }

  private async invokeCompletion(modelKey: string, prompt: string) {
    const parameters = this.buildCompletionParameters(modelKey, prompt);
    const command = new InvokeModelCommand(parameters);
    const rawResponse = await this.client.send(command);
    const jsonString = new TextDecoder(appConfig.UTF8_ENCODING).decode(rawResponse.body);
    const llmResponse: unknown = JSON.parse(jsonString);
    const config = this.getResponseExtractionConfig();
    return extractGenericCompletionResponse(
      llmResponse,
      config.schema,
      config.pathConfig,
      config.providerName,
    );
  }

  /**
   * Abstract method to be overriden. Build the request body object for the specific
   * completions model hosted on Bedrock. The base class will handle JSON stringification.
   */
  protected abstract buildCompletionRequestBody(
    modelKey: string,
    prompt: string,
  ): Record<string, unknown>;

  /**
   * Abstract method to get the provider-specific response extraction configuration.
   * Each provider implementation should return their schema, path configuration, and provider name.
   */
  protected abstract getResponseExtractionConfig(): ResponseExtractionConfig;
}
