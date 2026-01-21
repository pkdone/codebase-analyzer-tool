import { AzureOpenAI, OpenAI } from "openai";
import BaseOpenAILLM from "../common/base-openai-llm";
import type { ProviderInit } from "../../llm-provider.types";

/**
 * Mapping of model keys to their deployment environment variable keys.
 * Azure OpenAI requires each model to have its own deployment.
 */
const MODEL_TO_DEPLOYMENT_ENV_KEY: Record<string, string> = {
  "azure-text-embedding-ada-002": "AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT",
  "azure-gpt-4o": "AZURE_OPENAI_GPT4O_MODEL_DEPLOYMENT",
  "azure-gpt-4-turbo": "AZURE_OPENAI_GPT4_TURBO_MODEL_DEPLOYMENT",
};

/**
 * Class for Azure's own managed version of the OpenAI service.
 *
 * Azure OpenAI uses deployment names to route to models. Each model
 * requires its own deployment, configured via environment variables.
 */
export default class AzureOpenAILLM extends BaseOpenAILLM {
  // Private fields
  private readonly client: OpenAI;
  private readonly deployments: Record<string, string>;

  /**
   * Constructor.
   */
  constructor(init: ProviderInit) {
    super(init);
    const { providerParams, manifest } = init;
    const apiKey = providerParams.AZURE_OPENAI_LLM_API_KEY as string;
    const endpoint = providerParams.AZURE_OPENAI_ENDPOINT as string;

    // Build deployment mapping from environment variables
    this.deployments = {};
    for (const [modelKey, envKey] of Object.entries(MODEL_TO_DEPLOYMENT_ENV_KEY)) {
      const deployment = providerParams[envKey];
      if (deployment) {
        this.deployments[modelKey] = deployment as string;
      }
    }

    const apiVersion = manifest.providerSpecificConfig.apiVersion ?? "2025-01-01-preview";
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
   * For Azure OpenAI, this is the deployment name for the specific model.
   */
  protected getModelIdentifier(modelKey: string): string {
    const deployment = this.deployments[modelKey];
    if (!deployment) {
      throw new Error(
        `No deployment configured for model '${modelKey}'. ` +
          `Ensure the corresponding deployment environment variable is set.`,
      );
    }
    return deployment;
  }
}
