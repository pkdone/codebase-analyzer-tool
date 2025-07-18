import { OpenAI, RateLimitError, InternalServerError } from "openai";
import { APIError } from "openai/error";
import { LLMPurpose, LLMCompletionOptions } from "../../llm.types";
import AbstractLLM from "../../core/abstract-llm";

/**
 * Abstract base class for all OpenAI-based LLM providers.
 */
export default abstract class BaseOpenAILLM extends AbstractLLM {
  /**
   *
   * Execute the prompt against the LLM and return the relevant sumamry of the LLM's answer.
   */
  protected async invokeImplementationSpecificLLM(
    taskType: LLMPurpose,
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    const params = this.buildFullLLMParameters(taskType, modelKey, prompt, options);

    if (taskType === LLMPurpose.EMBEDDINGS) {
      return this.invokeImplementationSpecificEmbeddingsLLM(params as OpenAI.EmbeddingCreateParams);
    } else {
      return this.invokeImplementationSpecificCompletionLLM(
        params as OpenAI.ChatCompletionCreateParams,
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
    const llmResponses = (await this.getClient().chat.completions.create(
      params,
    )) as OpenAI.ChatCompletion;
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
   * Abstract method to get the client object for the specific LLM provider.
   */
  protected abstract getClient(): OpenAI;

  /**
   * Abstract method to build the full LLM parameters for the given model and prompt.
   */
  protected abstract buildFullLLMParameters(
    taskType: LLMPurpose,
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ): OpenAI.EmbeddingCreateParams | OpenAI.Chat.ChatCompletionCreateParams;
}
