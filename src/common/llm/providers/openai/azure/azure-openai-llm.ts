import { AzureOpenAI, OpenAI } from "openai";
import BaseOpenAILLM from "../common/base-openai-llm";
import type { ProviderInit } from "../../llm-provider.types";

/**
 * Class for Azure's own managed version of the OpenAI service.
 *
 * Azure OpenAI uses deployment names to route to models. Each model
 * requires its own deployment, configured via environment variables.
 * The deployment-to-model mapping is defined in the manifest's providerSpecificConfig.
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

    // Get deployment env key mapping from manifest configuration
    const deploymentEnvKeys = manifest.providerSpecificConfig.deploymentEnvKeys as
      | Record<string, string>
      | undefined;

    if (!deploymentEnvKeys) {
      throw new Error(
        "Azure OpenAI manifest is missing 'deploymentEnvKeys' in providerSpecificConfig",
      );
    }

    // Build deployment mapping from environment variables using manifest config
    this.deployments = {};
    for (const [modelKey, envKey] of Object.entries(deploymentEnvKeys)) {
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
