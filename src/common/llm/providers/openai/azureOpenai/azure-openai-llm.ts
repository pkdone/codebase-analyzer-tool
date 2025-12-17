import { AzureOpenAI, OpenAI } from "openai";
import {
  LLMModelKeysSet,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
} from "../../../types/llm.types";
import BaseOpenAILLM from "../common/base-openai-llm";
import { BadConfigurationLLMError } from "../../../types/llm-errors.types";
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
    providerParams: Record<string, unknown>,
    modelsKeys: LLMModelKeysSet,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    providerSpecificConfig: LLMProviderSpecificConfig,
    modelFamily: string,
    errorLogger: import("../../../tracking/llm-error-logger.interface").IErrorLogger,
    llmFeatures?: readonly string[],
  ) {
    super(
      modelsKeys,
      modelsMetadata,
      errorPatterns,
      providerSpecificConfig,
      modelFamily,
      errorLogger,
      llmFeatures,
    );
    const apiKey = providerParams.AZURE_OPENAI_LLM_API_KEY as string;
    const endpoint = providerParams.AZURE_OPENAI_ENDPOINT as string;
    const embeddingsDeployment = providerParams.AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT as string;
    const primaryCompletionsDeployment =
      providerParams.AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY as string;
    const secondaryCompletionsDeployment =
      providerParams.AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY as string;
    this.modelToDeploymentMappings = new Map();
    this.modelToDeploymentMappings.set(modelsKeys.embeddingsModelKey, embeddingsDeployment);
    this.modelToDeploymentMappings.set(
      modelsKeys.primaryCompletionModelKey,
      primaryCompletionsDeployment,
    );
    const secondaryCompletion = modelsKeys.secondaryCompletionModelKey;
    if (secondaryCompletion)
      this.modelToDeploymentMappings.set(secondaryCompletion, secondaryCompletionsDeployment);
    const apiVersion = providerSpecificConfig.apiVersion ?? "2025-01-01-preview";
    this.client = new AzureOpenAI({ endpoint, apiKey, apiVersion });
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
