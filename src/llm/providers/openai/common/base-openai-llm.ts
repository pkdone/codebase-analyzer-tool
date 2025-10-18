import { OpenAI, RateLimitError, InternalServerError } from "openai";
import { APIError } from "openai/error";
import {
  LLMPurpose,
  LLMCompletionOptions,
  LLMOutputFormat,
  LLMModelFeature,
} from "../../../types/llm.types";
import AbstractLLM from "../../abstract-llm";
import { llmConfig } from "../../../llm.config";
import { BadResponseContentLLMError } from "../../../types/llm-errors.types";

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
    if (taskType === LLMPurpose.EMBEDDINGS) {
      const params = this.buildEmbeddingParams(modelKey, prompt);
      return this.invokeEmbeddingsLLM(params);
    }
    const params = this.buildCompletionParams(modelKey, prompt, options);
    return this.invokeCompletionLLM(params);
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
      return error.code === "context_length_exceeded";
    }

    return false;
  }

  /**
   * Method to build the full LLM parameters for the given model and prompt.
   * This contains the common logic shared between OpenAI and Azure OpenAI providers.
   */
  private buildEmbeddingParams(modelKey: string, prompt: string): OpenAI.EmbeddingCreateParams {
    return {
      model: this.getModelIdentifier(modelKey),
      input: prompt,
    };
  }

  private buildCompletionParams(
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ): OpenAI.Chat.ChatCompletionCreateParams {
    const modelIdentifier = this.getModelIdentifier(modelKey);
    const modelMetadata = this.llmModelsMetadata[modelKey];
    const hasFixedTemperature =
      modelMetadata.features?.includes("fixed_temperature" satisfies LLMModelFeature) ?? false;
    const usesMaxCompletionTokens =
      modelMetadata.features?.includes("max_completion_tokens" satisfies LLMModelFeature) ?? false;

    const baseParams: OpenAI.Chat.ChatCompletionCreateParams = {
      model: modelIdentifier,
      messages: [{ role: llmConfig.LLM_ROLE_USER as "user", content: prompt }],
      ...(hasFixedTemperature
        ? {}
        : { temperature: this.providerSpecificConfig.temperature ?? llmConfig.DEFAULT_ZERO_TEMP }),
    };

    const params = usesMaxCompletionTokens
      ? { ...baseParams, max_completion_tokens: modelMetadata.maxCompletionTokens }
      : { ...baseParams, max_tokens: modelMetadata.maxCompletionTokens };

    if (options?.outputFormat === LLMOutputFormat.JSON) {
      params.response_format = { type: llmConfig.JSON_OUTPUT_TYPE };
    }

    return params;
  }

  /**
   * Type guard to check if the response from OpenAI is a valid ChatCompletion
   */
  private isChatCompletion(response: unknown): response is OpenAI.ChatCompletion {
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
  // Removed parameter shape type guards; explicit build methods remove need for runtime discrimination.

  /**
   * Invoke the actuall LLM's embedding API directly.
   */
  private async invokeEmbeddingsLLM(params: OpenAI.EmbeddingCreateParams) {
    // Invoke LLM
    const llmResponses = await this.getClient().embeddings.create(params);
    const llmResponse = llmResponses.data.at(0);

    if (!llmResponse) {
      throw new BadResponseContentLLMError(
        "No embedding data returned from OpenAI API",
        llmResponses,
      );
    }

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
  private async invokeCompletionLLM(params: OpenAI.ChatCompletionCreateParams) {
    // Invoke LLM
    const llmResponses = await this.getClient().chat.completions.create(params);
    if (!this.isChatCompletion(llmResponses))
      throw new BadResponseContentLLMError(
        "Received an unexpected response type from OpenAI completions API",
        llmResponses,
      );
    const llmResponse = llmResponses.choices.at(0);

    if (!llmResponse) {
      throw new BadResponseContentLLMError(
        "No completion choices returned from OpenAI API",
        llmResponses,
      );
    }

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
