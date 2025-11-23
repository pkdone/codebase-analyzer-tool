import "reflect-metadata";
import { inject, injectable } from "tsyringe";
import {
  LLMProvider,
  LLMModelKeysSet as LLMModelsKeysSet,
  LLMModelMetadata,
  ResolvedLLMModelMetadata,
} from "../types/llm.types";
import { EnvVars } from "../../env/env.types";
import { BadConfigurationLLMError } from "../types/llm-errors.types";
import { LLMProviderManifest } from "../providers/llm-provider.types";
import { JsonProcessor } from "../json-processing/core/json-processor";
import { llmTokens } from "../../di/tokens";
import { LLM_PROVIDER_REGISTRY } from "../providers";

/**
 * Manager for discovering, loading, and instantiating LLM providers based on their manifests
 */
@injectable()
export class LLMProviderManager {
  private readonly manifest: LLMProviderManifest;
  private readonly modelFamily: string;

  /**
   * Constructor takes modelFamily and JsonProcessor.
   * Initializes the manager by loading the manifest for the specified model family.
   * jsonProcessor is injected for use in provider factory calls.
   */
  constructor(
    modelFamily: string,
    @inject(llmTokens.JsonProcessor) private readonly jsonProcessor: JsonProcessor,
  ) {
    this.modelFamily = modelFamily;
    this.manifest = LLMProviderManager.loadManifestForModelFamily(this.modelFamily);
    console.log(
      `LLMProviderManager: Loaded provider for model family '${this.modelFamily}': ${this.manifest.providerName}`,
    );
  }

  /**
   * Static method to load a manifest for a specific model family without creating a full manager
   */
  static loadManifestForModelFamily(modelFamily: string): LLMProviderManifest {
    const manifest = LLM_PROVIDER_REGISTRY.get(modelFamily.toLowerCase());
    if (!manifest) {
      throw new BadConfigurationLLMError(
        `No provider manifest found for model family: ${modelFamily}. Available families: ${Array.from(LLM_PROVIDER_REGISTRY.keys()).join(", ")}`,
      );
    }
    return manifest;
  }

  /**
   * Get the loaded provider manifest.
   * Note: The manifest contains functions and cannot be deep cloned with structuredClone.
   */
  getLLMManifest(): LLMProviderManifest {
    return this.manifest;
  }

  /**
   * Get an LLM provider instance using the loaded manifest and environment
   */
  getLLMProvider(env: EnvVars): LLMProvider {
    const modelsKeysSet = this.buildModelsKeysSet(this.manifest);
    const modelsMetadata = this.buildModelsMetadata(this.manifest, env);
    const config = { providerSpecificConfig: this.manifest.providerSpecificConfig };
    const instance = new this.manifest.implementation(
      env,
      modelsKeysSet,
      modelsMetadata,
      this.manifest.errorPatterns,
      config,
      this.jsonProcessor,
      this.manifest.modelFamily,
      this.manifest.features,
    );
    return instance;
  }

  /**
   * Build LLMModelKeysSet from manifest
   */
  private buildModelsKeysSet(manifest: LLMProviderManifest): LLMModelsKeysSet {
    const keysSet: LLMModelsKeysSet = {
      embeddingsModelKey: manifest.models.embeddings.modelKey,
      primaryCompletionModelKey: manifest.models.primaryCompletion.modelKey,
    };
    if (manifest.models.secondaryCompletion)
      keysSet.secondaryCompletionModelKey = manifest.models.secondaryCompletion.modelKey;
    return keysSet;
  }

  /**
   * Build resolved model metadata from manifest and environment
   */
  private buildModelsMetadata(
    manifest: LLMProviderManifest,
    env: EnvVars,
  ): Record<string, ResolvedLLMModelMetadata> {
    const resolveUrn = (model: LLMModelMetadata): string => {
      const value = env[model.urnEnvKey];

      if (typeof value !== "string" || value.length === 0) {
        throw new BadConfigurationLLMError(
          `Required environment variable ${model.urnEnvKey} is not set, is empty, or is not a string. Found: ${String(value)}`,
        );
      }

      return value;
    };
    const models = [
      manifest.models.embeddings,
      manifest.models.primaryCompletion,
      ...(manifest.models.secondaryCompletion ? [manifest.models.secondaryCompletion] : []),
    ];
    return Object.fromEntries(
      models.map((model) => [model.modelKey, { ...model, urn: resolveUrn(model) }]),
    );
  }
}
