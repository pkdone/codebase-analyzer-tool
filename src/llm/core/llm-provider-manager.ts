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
import { logWarningMsg } from "../../common/utils/logging";
import { JsonProcessor } from "../json-processing/core/json-processor";
import { llmTokens } from "../../di/tokens";
import { LLM_PROVIDER_REGISTRY } from "../providers";

/**
 * Manager for discovering, loading, and instantiating LLM providers based on their manifests
 */
@injectable()
export class LLMProviderManager {
  private manifest?: LLMProviderManifest;
  private readonly modelFamily: string;
  private isInitialized = false;

  /**
   * Constructor takes modelFamily and JsonProcessor.
   * modelFamily is passed directly since we instantiate this manually,
   * jsonProcessor is injected for use in provider factory calls.
   */
  constructor(
    modelFamily: string,
    @inject(llmTokens.JsonProcessor) private readonly jsonProcessor: JsonProcessor,
  ) {
    this.modelFamily = modelFamily;
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
   * Initialize the manager
   */
  initialize(): void {
    if (this.isInitialized) {
      logWarningMsg("LLMProviderManager is already initialized.");
      return;
    }

    this.manifest = LLMProviderManager.loadManifestForModelFamily(this.modelFamily);
    console.log(
      `LLMProviderManager: Loaded provider for model family '${this.modelFamily}': ${this.manifest.providerName}`,
    );
    this.isInitialized = true;
  }

  /**
   * Get the loaded provider manifest.
   * Note: The manifest contains functions and cannot be deep cloned with structuredClone.
   */
  getLLMManifest(): LLMProviderManifest {
    const manifest = this.getInitializedManifest();
    return manifest;
  }

  /**
   * Get an LLM provider instance using the loaded manifest and environment
   */
  getLLMProvider(env: EnvVars): LLMProvider {
    const manifest = this.getInitializedManifest();
    const modelsKeysSet = this.buildModelsKeysSet(manifest);
    const modelsMetadata = this.buildModelsMetadata(manifest, env);
    const config = { providerSpecificConfig: manifest.providerSpecificConfig };
    const instance = new manifest.implementation(
      env,
      modelsKeysSet,
      modelsMetadata,
      manifest.errorPatterns,
      config,
      this.jsonProcessor,
      manifest.modelFamily,
    );
    // Attach features if available (duck typing to avoid interface changes to all providers yet)
    if (manifest.features && Array.isArray(manifest.features)) {
      (instance as unknown as { llmFeatures?: readonly string[] }).llmFeatures = manifest.features;
    }
    return instance;
  }

  /**
   * Get the initialized manifest, throwing error if not initialized
   */
  private getInitializedManifest(): LLMProviderManifest {
    if (!this.isInitialized || !this.manifest)
      throw new Error("LLMProviderManager is not initialized. Call initialize() first.");
    return this.manifest;
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
