import { AzureOpenAI, OpenAI } from "openai";
import {
  LLMModelKeysSet,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
} from "../../../types/llm.types";
import BaseOpenAILLM from "../common/base-openai-llm";
import { BadConfigurationLLMError } from "../../../types/llm-errors.types";
import { AZURE_OPENAI } from "./azure-openai.manifest";
import { LLMProviderSpecificConfig } from "../../llm-provider.types";
import { JsonProcessor } from "../../../json-processing/core/json-processor";

/**
 * Configuration object for Azure OpenAI LLM provider.
 * Encapsulates all Azure OpenAI-specific configuration parameters.
 */
export interface AzureOpenAIConfig {
  apiKey: string;
  endpoint: string;
  embeddingsDeployment: string;
  primaryCompletionsDeployment: string;
  secondaryCompletionsDeployment: string;
  providerSpecificConfig?: LLMProviderSpecificConfig;
}

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
    config: AzureOpenAIConfig,
    jsonProcessor: JsonProcessor,
  ) {
    if (!config.providerSpecificConfig) {
      throw new Error("providerSpecificConfig is required but was not provided");
    }
    super(modelsKeys, modelsMetadata, errorPatterns, config.providerSpecificConfig, jsonProcessor);
    this.modelToDeploymentMappings = new Map();
    this.modelToDeploymentMappings.set(modelsKeys.embeddingsModelKey, config.embeddingsDeployment);
    this.modelToDeploymentMappings.set(
      modelsKeys.primaryCompletionModelKey,
      config.primaryCompletionsDeployment,
    );
    const secondaryCompletion = modelsKeys.secondaryCompletionModelKey;
    if (secondaryCompletion)
      this.modelToDeploymentMappings.set(
        secondaryCompletion,
        config.secondaryCompletionsDeployment,
      );
    const apiVersion = config.providerSpecificConfig.apiVersion ?? "2025-01-01-preview";
    this.client = new AzureOpenAI({ endpoint: config.endpoint, apiKey: config.apiKey, apiVersion });
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
   * Get the model identifier for Azure OpenAI provider.
   * For Azure OpenAI, this is the deployment name mapped to the model key.
   */
  protected getModelIdentifier(modelKey: string): string {
    const deployment = this.modelToDeploymentMappings.get(modelKey);
    if (!deployment)
      throw new BadConfigurationLLMError(
        `Model key ${modelKey} not found for ${this.constructor.name}`,
      );
    return deployment;
  }
}
