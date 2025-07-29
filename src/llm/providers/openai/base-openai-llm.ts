import { OpenAI, RateLimitError, InternalServerError } from "openai";
import { APIError } from "openai/error";
import { LLMPurpose, LLMCompletionOptions, LLMOutputFormat } from "../../types/llm.types";
import AbstractLLM from "../../core/abstract-llm";
import { llmConfig } from "../../llm.config";
import { BadResponseContentLLMError } from "../../types/llm-errors.types";

/**
 * Type guard to check if the response from OpenAI is a valid ChatCompletion
 */
function isChatCompletion(response: unknown): response is OpenAI.ChatCompletion {
  if (!response || typeof response !== "object") return false;
  const resp = response as Record<string, unknown>;
  return (
    "choices" in resp &&
    Array.isArray(resp.choices) &&
    resp.choices.length > 0 &&
    typeof resp.choices[0] === "object" &&
    resp.choices[0] !== null &&
    "message" in resp.choices[0]
  );
}

/**
 * Type guard to check if parameters are for embedding requests
 */
function isEmbeddingParams(
  params: OpenAI.EmbeddingCreateParams | OpenAI.Chat.ChatCompletionCreateParams,
): params is OpenAI.EmbeddingCreateParams {
  return "input" in params && !("messages" in params);
}

/**
 * Type guard to check if parameters are for completion requests
 */
function isCompletionParams(
  params: OpenAI.EmbeddingCreateParams | OpenAI.Chat.ChatCompletionCreateParams,
): params is OpenAI.Chat.ChatCompletionCreateParams {
  return "messages" in params && !("input" in params);
}

/**
 * Abstract base class for all OpenAI-based LLM providers.
 */
export default abstract class BaseOpenAILLM extends AbstractLLM {
  /**
   *
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   */
  protected async invokeProvider(
    taskType: LLMPurpose,
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    const params = this.buildFullLLMParameters(taskType, modelKey, prompt, options);

    if (isEmbeddingParams(params)) {
      return this.invokeImplementationSpecificEmbeddingsLLM(params);
    } else if (isCompletionParams(params)) {
      return this.invokeImplementationSpecificCompletionLLM(params);
    } else {
      throw new Error(
        "Generated LLM parameters did not match expected shape for embeddings or completions.",
      );
    }
  }

  /**
   * Invoke the actuall LLM's embedding API directly.
   */
  protected async invokeImplementationSpecificEmbeddingsLLM(params: OpenAI.EmbeddingCreateParams) {
    // Invoke LLM
    const llmResponses = await this.getClient().embeddings.create(params);
    const llmResponse = llmResponses.data[0];

    // Capture response content
    const responseContent = llmResponse.embedding;

    // Capture finish reason
    const isIncompleteResponse = !responseContent;

    // Capture token usage
    const promptTokens = llmResponses.usage.prompt_tokens;
    const completionTokens = -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }

  /**
   * Invoke the actuall LLM's completion API directly.
   */
  protected async invokeImplementationSpecificCompletionLLM(
    params: OpenAI.ChatCompletionCreateParams,
  ) {
    // Invoke LLM
    const llmResponses = await this.getClient().chat.completions.create(params);
    if (!isChatCompletion(llmResponses))
      throw new BadResponseContentLLMError(
        "Received an unexpected response type from OpenAI completions API",
        llmResponses,
      );
    const llmResponse = llmResponses.choices[0];

    // Capture response content
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const responseContent = llmResponse?.message?.content; // Using extra condition checking in case Open AI types say these should exists, but they don't happen to at runtime

    // Capture finish reason
    const finishReason = llmResponse.finish_reason;
    const isIncompleteResponse = finishReason === "length" || !responseContent;

    // Capture token usage
    const promptTokens = llmResponses.usage?.prompt_tokens ?? -1;
    const completionTokens = llmResponses.usage?.completion_tokens ?? -1;
    const maxTotalTokens = -1; // Not using "total_tokens" as that is total of prompt + completion tokens tokens and not the max limit
    const tokenUsage = { promptTokens, completionTokens, maxTotalTokens };
    return { isIncompleteResponse, responseContent, tokenUsage };
  }

  /**
   * See if an error object indicates a network issue or throttling event.
   */
  protected isLLMOverloaded(error: unknown) {
    if (error instanceof APIError && error.code === "insufficient_quota") {
      return false;
    }

    return error instanceof RateLimitError || error instanceof InternalServerError;
  }

  /**
   * Check to see if error code indicates potential token limit has been exceeded.
   */
  protected isTokenLimitExceeded(error: unknown) {
    if (error instanceof APIError) {
      return error.code === "context_length_exceeded" || error.type === "invalid_request_error";
    }

    return false;
  }

  /**
   * Method to build the full LLM parameters for the given model and prompt.
   * This contains the common logic shared between OpenAI and Azure OpenAI providers.
   */
  protected buildFullLLMParameters(
    taskType: LLMPurpose,
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ): OpenAI.EmbeddingCreateParams | OpenAI.Chat.ChatCompletionCreateParams {
    const modelIdentifier = this.getModelIdentifier(modelKey);

    if (taskType === LLMPurpose.EMBEDDINGS) {
      const params: OpenAI.EmbeddingCreateParams = {
        model: modelIdentifier,
        input: prompt,
      };
      return params;
    } else {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: modelIdentifier,
        temperature: this.providerSpecificConfig.temperature ?? llmConfig.DEFAULT_ZERO_TEMP,
        messages: [{ role: llmConfig.LLM_ROLE_USER as "user", content: prompt }],
        max_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
      };

      if (options?.outputFormat === LLMOutputFormat.JSON) {
        params.response_format = { type: "json_object" };
      }

      return params;
    }
  }

  /**
   * Abstract method to get the client object for the specific LLM provider.
   */
  protected abstract getClient(): OpenAI;

  /**
   * Abstract method to get the model identifier for the specific LLM provider.
   * For OpenAI, this would be the model URN.
   * For Azure OpenAI, this would be the deployment name.
   */
  protected abstract getModelIdentifier(modelKey: string): string;
}
