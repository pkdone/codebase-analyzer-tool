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
} from "../../types/llm.types";
import { llmConfig } from "../../llm.config";
import { LLMImplSpecificResponseSummary, LLMProviderSpecificConfig } from "../llm-provider.types";
import { getErrorText, logErrorMsgAndDetail } from "../../../common/utils/error-utils";
import AbstractLLM from "../../core/abstract-llm";
import { z } from "zod";
import { BadResponseContentLLMError } from "../../types/llm-errors.types";

/**
 * Zod schema for Bedrock embeddings response validation
 */
const BedrockEmbeddingsResponseSchema = z.object({
  embedding: z.array(z.number()).optional(),
  inputTextTokenCount: z.number().optional(),
  results: z.array(z.object({
    tokenCount: z.number().optional(),
  })).optional(),
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
  protected async invokeProvider(
    taskType: LLMPurpose,
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    const fullParameters = this.buildFullLLMParameters(taskType, modelKey, prompt, options);
    const command = new InvokeModelCommand(fullParameters);
    const rawResponse = await this.client.send(command);
    const llmResponse: unknown = JSON.parse(
      Buffer.from(rawResponse.body).toString(llmConfig.LLM_UTF8_ENCODING),
    );

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
      contentType: llmConfig.MIME_TYPE_JSON,
      accept: llmConfig.MIME_TYPE_ANY,
      body,
    };
  }

  /**
   * Extract the relevant information from the LLM specific response.
   */
  protected extractEmbeddingModelSpecificResponse(llmResponse: unknown) {
    const validation = BedrockEmbeddingsResponseSchema.safeParse(llmResponse);
    if (!validation.success) throw new BadResponseContentLLMError("Invalid Bedrock embeddings response structure", llmResponse);
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
    const lowercaseContent = getErrorText(error).toLowerCase();
    return errorKeywords.some((keyword) => lowercaseContent.includes(keyword));
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


