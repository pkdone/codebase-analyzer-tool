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
  LLMCompletionOptions,
} from "../../llm.types";
import { llmConfig } from "../../llm.config";
import { LLMImplSpecificResponseSummary, LLMProviderSpecificConfig } from "../llm-provider.types";
import { getErrorText, logErrorMsgAndDetail } from "../../../common/utils/error-utils";
import AbstractLLM from "../../core/abstract-llm";

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
    providerSpecificConfig: LLMProviderSpecificConfig = {},
  ) {
    super(modelsKeys, modelsMetadata, errorPatterns, providerSpecificConfig);
    const requestTimeoutMillis =
      providerSpecificConfig.requestTimeoutMillis ?? llmConfig.DEFAULT_REQUEST_WAIT_TIMEOUT_MILLIS;
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
  protected async invokeImplementationSpecificLLM(
    taskType: LLMPurpose,
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    // Invoke LLM
    const fullParameters = this.buildFullLLMParameters(taskType, modelKey, prompt, options);
    const command = new InvokeModelCommand(fullParameters);
    const rawResponse = await this.client.send(command);
    const llmResponse = JSON.parse(
      Buffer.from(rawResponse.body).toString(llmConfig.LLM_UTF8_ENCODING),
    ) as Record<string, unknown>;

    // Capture response content, finish reason and token usage
    if (taskType === LLMPurpose.EMBEDDINGS) {
      return this.extractEmbeddingModelSpecificResponse(llmResponse);
    } else {
      return this.extractCompletionModelSpecificResponse(llmResponse);
    }
  }

  /**
   * Assemble the AWS Bedrock API parameters structure for embeddings and completions models with
   * the prompt.
   */
  protected buildFullLLMParameters(
    taskType: LLMPurpose,
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    let body;

    if (taskType === LLMPurpose.EMBEDDINGS) {
      body = JSON.stringify({
        inputText: prompt,
        //dimensions: this.getEmbeddedModelDimensions(),  // Throws error but when moving to Titan Text Embeddings V2 should be able to set dimensions to 56, 512, 1024 according to: https://docs.aws.amazon.com/code-library/latest/ug/bedrock-runtime_example_bedrock-runtime_InvokeModelWithResponseStream_TitanTextEmbeddings_section.html
      });
    } else {
      body = this.buildCompletionModelSpecificParameters(modelKey, prompt, options);
    }

    return {
      modelId: this.llmModelsMetadata[modelKey].urn,
      contentType: llmConfig.LLM_RESPONSE_JSON_CONTENT_TYPE,
      accept: llmConfig.LLM_RESPONSE_ANY_CONTENT_TYPE,
      body,
    };
  }

  /**
   * Extract the relevant information from the LLM specific response.
   */
  protected extractEmbeddingModelSpecificResponse(llmResponse: TitanEmbeddingsLLMSpecificResponse) {
    const responseContent = llmResponse.embedding ?? [];
    const isIncompleteResponse = !responseContent; // If no content assume prompt maxed out total tokens available
    const promptTokens = llmResponse.inputTextTokenCount ?? -1;
    const completionTokens = llmResponse.results?.[0]?.tokenCount ?? -1;
    const maxTotalTokens = -1;
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
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
  protected isTokenLimitExceeded(error: unknown) {
    if (error instanceof ValidationException) {
      const lowercaseContent = getErrorText(error).toLowerCase();

      if (
        lowercaseContent.includes("too many input tokens") ||
        lowercaseContent.includes("expected maxlength") ||
        lowercaseContent.includes("input is too long") ||
        lowercaseContent.includes("input length") ||
        lowercaseContent.includes("too large for model") ||
        lowercaseContent.includes("please reduce the length of the prompt")
      ) {
        // Llama
        return true;
      }
    }

    return false;
  }

  /**
   * Abstract method to be overriden. Assemble the AWS Bedrock API parameters structure for the
   * specific completions model hosted on Bedroc.
   */
  protected abstract buildCompletionModelSpecificParameters(
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ): string;

  /**
   * Extract the relevant information from the completion LLM specific response.
   */
  protected abstract extractCompletionModelSpecificResponse(
    llmResponse: unknown,
  ): LLMImplSpecificResponseSummary;
}

/**
 * Type definitions for the Titan specific embeddings LLM response usage.
 */
interface TitanEmbeddingsLLMSpecificResponse {
  embedding?: number[];
  inputTextTokenCount?: number;
  results?: {
    tokenCount?: number;
  }[];
}
