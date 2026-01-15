import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  ServiceUnavailableException,
  ThrottlingException,
  ModelTimeoutException,
  ValidationException,
} from "@aws-sdk/client-bedrock-runtime";
import { CredentialsProviderError } from "@smithy/property-provider";
import { llmConfig } from "../../../config/llm.config";
import { formatError } from "../../../../utils/error-formatters";
import { logErr } from "../../../../utils/logging";
import BaseLLMProvider from "../../base-llm-provider";
import { z } from "zod";
import { LLMError, LLMErrorCode } from "../../../types/llm-errors.types";
import { createTokenUsageRecord } from "../../../types/llm.types";
import type { JsonObject } from "../../../types/json-value.types";
import {
  extractGenericCompletionResponse,
  type ResponsePathConfig,
} from "./bedrock-response-parser";

const TOKEN_LIMIT_ERROR_KEYWORDS = [
  "too many input tokens",
  "expected maxlength",
  "input is too long",
  "input length",
  "too large for model",
  "please reduce the length of the prompt",
] as const;

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
export default abstract class BaseBedrockLLM extends BaseLLMProvider {
  // Private fields
  private readonly client: BedrockRuntimeClient;

  /**
   * Constructor.
   */
  constructor(init: import("../../llm-provider.types").ProviderInit) {
    super(init);
    const requestTimeoutMillis = init.manifest.providerSpecificConfig.requestTimeoutMillis;
    this.client = new BedrockRuntimeClient({
      requestHandler: { requestTimeout: requestTimeoutMillis },
    });
  }

  /**
   * Call close on underlying LLM client library to release resources.
   */
  override async close(): Promise<void> {
    try {
      this.client.destroy();
    } catch (error: unknown) {
      logErr("Error when calling destroy on AWSBedrock LLM", error);
    }
    // Implementation of async interface - destroy() is synchronous but base class requires Promise
    await Promise.resolve();
  }

  /**
   * Validate AWS credentials are available and not expired.
   * Forces credential resolution to fail fast at startup if SSO login is required.
   */
  override async validateCredentials(): Promise<void> {
    try {
      const credentials = this.client.config.credentials;
      if (typeof credentials === "function") {
        await credentials();
      }
    } catch (error: unknown) {
      if (error instanceof CredentialsProviderError) {
        throw new LLMError(
          LLMErrorCode.PROVIDER_ERROR,
          `AWS credentials are unavailable or expired. Please run 'aws sso login' and try again. Original error: ${error.message}`,
          error,
        );
      }
      throw error;
    }
  }

  /**
   * Execute the embedding prompt against the LLM and return the relevant summary.
   */
  protected async invokeEmbeddingProvider(modelKey: string, prompt: string) {
    const parameters = this.buildEmbeddingParameters(modelKey, prompt);
    const command = new InvokeModelCommand(parameters);
    const rawResponse = await this.client.send(command);
    const jsonString = new TextDecoder(llmConfig.UTF8_ENCODING).decode(rawResponse.body);
    const llmResponse: unknown = JSON.parse(jsonString);
    return this.extractEmbeddingModelSpecificResponse(llmResponse);
  }

  /**
   * Execute the completion prompt against the LLM and return the relevant summary.
   */
  protected async invokeCompletionProvider(modelKey: string, prompt: string) {
    const parameters = this.buildCompletionParameters(modelKey, prompt);
    const command = new InvokeModelCommand(parameters);
    const rawResponse = await this.client.send(command);
    const jsonString = new TextDecoder(llmConfig.UTF8_ENCODING).decode(rawResponse.body);
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
   * See if the contents of the responses indicate inability to fully process request due to
   * overloading.
   */
  protected isLLMOverloaded(error: unknown) {
    if (
      error instanceof ThrottlingException ||
      error instanceof ModelTimeoutException ||
      error instanceof ServiceUnavailableException
    ) {
      return true;
    }

    if (error instanceof Error) {
      const errMsg = formatError(error).toLowerCase() || "";

      if (
        errMsg.includes("stream timed out because of no activity") ||
        errMsg.includes("system encountered an unexpected error during processing") ||
        errMsg.includes("pending stream has been cancel")
      ) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check to see if error code indicates potential token limit has been exceeded.
   * Type guard that narrows the error type to ValidationException when true.
   */
  protected isTokenLimitExceeded(error: unknown): error is ValidationException {
    if (!(error instanceof ValidationException)) return false;
    const lowercaseContent = formatError(error).toLowerCase();
    return TOKEN_LIMIT_ERROR_KEYWORDS.some((keyword) => lowercaseContent.includes(keyword));
  }

  /**
   * Extract the relevant information from the LLM specific response.
   */
  private extractEmbeddingModelSpecificResponse(llmResponse: unknown) {
    const validation = BedrockEmbeddingsResponseSchema.safeParse(llmResponse);
    if (!validation.success)
      throw new LLMError(
        LLMErrorCode.BAD_RESPONSE_CONTENT,
        "Invalid Bedrock embeddings response structure",
        llmResponse,
      );
    const response = validation.data;
    const responseContent = response.embedding ?? [];
    const isIncompleteResponse = !responseContent; // If no content assume prompt maxed out total tokens available
    const tokenUsage = createTokenUsageRecord(
      response.inputTextTokenCount,
      response.results?.[0]?.tokenCount,
    );
    return { isIncompleteResponse, responseContent, tokenUsage };
  }

  /**
   * Build common Bedrock API parameters structure.
   * Extracts the common pattern of modelId, contentType, accept, and body.
   */
  private buildBedrockParameters(modelKey: string, bodyObj: JsonObject) {
    return {
      modelId: this.llmModelsMetadata[modelKey].urn,
      contentType: llmConfig.MIME_TYPE_JSON,
      accept: llmConfig.MIME_TYPE_ANY,
      body: JSON.stringify(bodyObj),
    };
  }

  /**
   * Assemble the AWS Bedrock API parameters structure for embeddings models.
   */
  private buildEmbeddingParameters(modelKey: string, prompt: string) {
    const bodyObj = { inputText: prompt };
    return this.buildBedrockParameters(modelKey, bodyObj);
  }

  /**
   * Assemble the AWS Bedrock API parameters structure for completions models.
   */
  private buildCompletionParameters(modelKey: string, prompt: string) {
    const bodyObj = this.buildCompletionRequestBody(modelKey, prompt);
    return this.buildBedrockParameters(modelKey, bodyObj);
  }

  /**
   * Build the request body object for completions.
   * Each concrete Bedrock provider must implement this to match their specific API format.
   * Returns a JsonObject to ensure the request body is JSON-serializable.
   */
  protected abstract buildCompletionRequestBody(modelKey: string, prompt: string): JsonObject;

  /**
   * Abstract method to get the provider-specific response extraction configuration.
   * Each provider implementation should return their schema, path configuration, and provider name.
   */
  protected abstract getResponseExtractionConfig(): ResponseExtractionConfig;
}
