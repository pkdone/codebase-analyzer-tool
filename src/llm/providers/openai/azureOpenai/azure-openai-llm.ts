import { AzureOpenAI, OpenAI } from "openai";
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
import { BadConfigurationLLMError } from "../../../errors/llm-errors.types";
import { AZURE_OPENAI } from "./azure-openai.manifest";
import { LLMProviderSpecificConfig } from "../../llm-provider.types";

/**
 * Class for Azure's own managed version of the OpenAI service.
 */
export default class AzureOpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;
  private readonly modelToDeploymentMappings: Map<string, string>;

  /**
   * Constructor.
   */
  constructor(
    modelsKeys: LLMModelKeysSet,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    apiKey: string,
    endpoint: string,
    embeddingsDeployment: string,
    primaryCompletionsDeployment: string,
    secondaryCompletionsDeployment: string,
    providerSpecificConfig: LLMProviderSpecificConfig = {},
  ) {
    super(modelsKeys, modelsMetadata, errorPatterns, providerSpecificConfig);
    this.modelToDeploymentMappings = new Map();
    this.modelToDeploymentMappings.set(modelsKeys.embeddingsModelKey, embeddingsDeployment);
    this.modelToDeploymentMappings.set(
      modelsKeys.primaryCompletionModelKey,
      primaryCompletionsDeployment,
    );
    const secondaryCompletion = modelsKeys.secondaryCompletionModelKey;

    if (secondaryCompletion) {
      this.modelToDeploymentMappings.set(secondaryCompletion, secondaryCompletionsDeployment);
    }

    const apiVersion = providerSpecificConfig.apiVersion ?? "2025-01-01-preview";
    this.client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
  }

  /**
   * Get the model family this LLM implementation belongs to.
   */
  getModelFamily(): string {
    return AZURE_OPENAI;
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
    const deployment = this.modelToDeploymentMappings.get(modelKey);
    if (!deployment)
      throw new BadConfigurationLLMError(
        `Model key ${modelKey} not found for ${this.constructor.name}`,
      );

    if (taskType === LLMPurpose.EMBEDDINGS) {
      const params: OpenAI.EmbeddingCreateParams = {
        model: deployment,
        input: prompt,
      };
      return params;
    } else {
      const config = this.providerSpecificConfig;
      const params: OpenAI.Chat.ChatCompletionCreateParams = {
        model: deployment,
        temperature: config.temperature ?? llmConfig.DEFAULT_ZERO_TEMP,
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
