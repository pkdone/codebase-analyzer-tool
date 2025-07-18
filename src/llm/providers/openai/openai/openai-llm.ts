import { OpenAI } from "openai";
import { llmConfig } from "../../../llm.config";
import {
  LLMModelKeysSet,
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
  LLMCompletionOptions,
  LLMOutputFormat,
} from "../../../llm.types";
import BaseOpenAILLM from "../base-openai-llm";
import { OPENAI } from "./openai.manifest";

/**
 * Class for the public OpenAI service.
 */
export default class OpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;

  /**
   * Constructor.
   */
  constructor(
    modelsKeys: LLMModelKeysSet,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    apiKey: string,
  ) {
    super(modelsKeys, modelsMetadata, errorPatterns);
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return OPENAI;
  }

  /**
   * Abstract method to get the client object for the specific LLM provider.
   */
  protected getClient() {
    return this.client;
  }

  /**
   * Method to assemble the OpenAI API parameters structure for the given model and prompt.
   */
  protected buildFullLLMParameters(
    taskType: LLMPurpose,
    modelKey: string,
    prompt: string,
    options?: LLMCompletionOptions,
  ) {
    if (taskType === LLMPurpose.EMBEDDINGS) {
      const params: OpenAI.EmbeddingCreateParams = {
        model: this.llmModelsMetadata[modelKey].urn,
        input: prompt,
      };
      return params;
    } else {
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: this.llmModelsMetadata[modelKey].urn,
        temperature: llmConfig.DEFAULT_ZERO_TEMP,
        messages: [{ role: llmConfig.LLM_ROLE_USER as "user", content: prompt }],
        max_tokens: this.llmModelsMetadata[modelKey].maxCompletionTokens,
      };

      if (options?.outputFormat === LLMOutputFormat.JSON) {
        params.response_format = { type: "json_object" };
      }

      return params;
    }
  }
}
