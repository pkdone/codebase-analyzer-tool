import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import path from "path";
import { appConfig } from "../../config/app.config";
import {
  LLMProvider,
  LLMModelKeysSet as LLMModelsKeysSet,
  LLMModelMetadata,
  ResolvedLLMModelMetadata,
} from "../types/llm.types";
import { EnvVars } from "../../env/env.types";
import { BadConfigurationLLMError } from "../types/llm-errors.types";
import { LLMProviderManifest } from "../providers/llm-provider.types";
import { logErrorMsgAndDetail, logWarningMsg } from "../../common/utils/error-utils";
import { readDirContents } from "../../common/utils/fs-utils";
import { TOKENS } from "../../di/tokens";

/**
 * Manager for discovering, loading, and instantiating LLM providers based on their manifests
 */
@injectable()
export class LLMProviderManager {
  private manifest?: LLMProviderManifest;
  private readonly modelFamily: string;
  private isInitialized = false;

  /**
   * Constructor for dependency injection pattern
   */
  constructor(@inject(TOKENS.LLMProviderManager) modelFamily: string) {
    this.modelFamily = modelFamily;
  }

  /**
   * Static method to load a manifest for a specific model family without creating a full manager
   */
  static async loadManifestForModelFamily(modelFamily: string): Promise<LLMProviderManifest> {
    const providersRootPath = path.join(__dirname, appConfig.PROVIDERS_FOLDER_PATH);
    const manifest = await LLMProviderManager.findManifestRecursively(
      providersRootPath,
      modelFamily,
    );
    if (!manifest)
      throw new BadConfigurationLLMError(
        `No provider manifest found for model family: ${modelFamily}`,
      );
    return manifest;
  }

  /**
   * Recursively search for a manifest matching the target model family
   */
  private static async findManifestRecursively(
    searchPath: string,
    targetModelFamily: string,
  ): Promise<LLMProviderManifest | undefined> {
    try {
      const entries = await readDirContents(searchPath);

      // First, check if current directory has a manifest file
      const manifestFile = entries
        .filter((file) => file.isFile())
        .find((file) => file.name.endsWith(appConfig.MANIFEST_FILE_SUFFIX));

      if (manifestFile) {
        const manifestPath = path.join(searchPath, manifestFile.name);
        const manifest = await LLMProviderManager.loadAndValidateManifest(
          manifestPath,
          targetModelFamily,
        );
        if (manifest) return manifest;
      }

      // Then, recursively search subdirectories
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const subPath = path.join(searchPath, entry.name);
          const manifest = await LLMProviderManager.findManifestRecursively(
            subPath,
            targetModelFamily,
          );
          if (manifest) return manifest;
        }
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Failed to search directory ${searchPath}`, error);
    }

    return undefined;
  }

  /**
   * Load and validate a manifest file, returning it only if it matches the target model family
   */
  private static async loadAndValidateManifest(
    manifestPath: string,
    targetModelFamily: string,
  ): Promise<LLMProviderManifest | undefined> {
    try {
      const module: unknown = await import(manifestPath);
      if (!module || typeof module !== "object") return undefined;
      const manifestKey = Object.keys(module).find((key) =>
        key.endsWith(appConfig.PROVIDER_MANIFEST_EXPORT_SUFFIX),
      );
      if (!manifestKey || !(manifestKey in module)) return undefined;
      const manifestValue = (module as Record<string, unknown>)[manifestKey];

      if (
        LLMProviderManager.isValidManifest(manifestValue) &&
        manifestValue.modelFamily === targetModelFamily
      ) {
        return manifestValue;
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(`Failed to load manifest from ${manifestPath}`, error);
    }

    return undefined;
  }

  /**
   * Type guard to validate if a value is a valid LLMProviderManifest
   */
  private static isValidManifest(value: unknown): value is LLMProviderManifest {
    return (
      value !== null &&
      typeof value === "object" &&
      "modelFamily" in value &&
      "factory" in value &&
      typeof (value as Record<string, unknown>).factory === "function"
    );
  }

  /**
   * Initialize the manager (async initialization)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      logWarningMsg("LLMProviderManager is already initialized.");
      return;
    }

    this.manifest = await LLMProviderManager.loadManifestForModelFamily(this.modelFamily);
    console.log(
      `LLMProviderManager: Loaded provider for model family '${this.modelFamily}': ${this.manifest.providerName}`,
    );
    this.isInitialized = true;
  }

  /**
   * Get the loaded provider manifest
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
    return manifest.factory(
      env,
      modelsKeysSet,
      modelsMetadata,
      manifest.errorPatterns,
      manifest.providerSpecificConfig,
    );
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
