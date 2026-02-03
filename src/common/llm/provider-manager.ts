/**
 * ProviderManager - Manages multiple LLM provider instances for cross-provider fallback chains.
 */

import type { LLMProvider } from "./types/llm-provider.interface";
import type { ResolvedLLMModelMetadata, ResolvedModelChain } from "./types/llm-model.types";
import type { LLMProviderManifest, ProviderInit } from "./providers/llm-provider.types";
import type { LLMErrorLoggingConfig, LLMProviderRegistry } from "./config/llm-module-config.types";
import { LLMError, LLMErrorCode } from "./types/llm-errors.types";
import { loadManifestForProviderFamily } from "./utils/manifest-loader";
import { ShutdownBehavior } from "./types/llm-shutdown.types";

/**
 * Configuration for initializing the ProviderManager.
 */
export interface ProviderManagerConfig {
  /** Resolved model chain for completions and embeddings */
  readonly resolvedModelChain: ResolvedModelChain;
  /** Provider-specific parameters (e.g., API keys, endpoints) */
  readonly providerParams: Record<string, unknown>;
  /** Error logging configuration */
  readonly errorLogging: LLMErrorLoggingConfig;
  /** Registry of available LLM provider manifests */
  readonly providerRegistry: LLMProviderRegistry;
}

/**
 * Manages multiple LLM provider instances, enabling cross-provider fallback chains.
 *
 * Features:
 * - Lazy instantiation: providers are only created when first needed
 * - Caches provider instances for reuse
 * - Aggregates model metadata across all active providers
 * - Handles shutdown for all providers
 */
export class ProviderManager {
  private readonly providers = new Map<string, LLMProvider>();
  private readonly manifests = new Map<string, LLMProviderManifest>();
  private readonly config: ProviderManagerConfig;

  constructor(config: ProviderManagerConfig) {
    this.config = config;

    // Pre-load manifests for all provider families in the chain
    const families = this.getRequiredProviderFamilies();
    for (const family of families) {
      const manifest = loadManifestForProviderFamily(family, config.providerRegistry);
      this.manifests.set(family, manifest);
    }
  }

  /**
   * Get or create a provider instance for the specified family.
   * Uses lazy instantiation - providers are created on first access.
   */
  getProvider(providerFamily: string): LLMProvider {
    // Return cached provider if available
    const existing = this.providers.get(providerFamily);
    if (existing) {
      return existing;
    }

    // Get manifest for this provider family
    const manifest = this.manifests.get(providerFamily);
    if (!manifest) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        `Provider family '${providerFamily}' is not in the configured model chain. ` +
          `Available families: ${Array.from(this.manifests.keys()).join(", ")}`,
      );
    }

    // Extract typed configuration using manifest's extractor
    // This decouples providers from specific environment variable names
    const extractedConfig = manifest.extractConfig(this.config.providerParams);

    // Create provider instance with extracted configuration
    const init: ProviderInit = {
      manifest,
      providerParams: this.config.providerParams,
      extractedConfig,
      resolvedModelChain: this.config.resolvedModelChain,
      errorLogging: this.config.errorLogging,
    };

    const provider = new manifest.implementation(init);
    this.providers.set(providerFamily, provider);

    console.log(`ProviderManager: Instantiated provider for '${providerFamily}'`);
    return provider;
  }

  /**
   * Get model metadata for a specific model from its provider.
   */
  getModelMetadata(providerFamily: string, modelKey: string): ResolvedLLMModelMetadata | undefined {
    const provider = this.getProvider(providerFamily);
    const allMetadata = provider.getModelsMetadata();
    return allMetadata[modelKey];
  }

  /**
   * Get aggregated model metadata from all active providers.
   * Keys are formatted as "providerFamily:modelKey" to avoid collisions.
   */
  getAllModelsMetadata(): Record<string, ResolvedLLMModelMetadata> {
    const result: Record<string, ResolvedLLMModelMetadata> = {};

    for (const [family, provider] of this.providers) {
      const metadata = provider.getModelsMetadata();
      for (const [key, value] of Object.entries(metadata)) {
        result[`${family}:${key}`] = value;
      }
    }

    return result;
  }

  /**
   * Get the provider families that are required by the model chain.
   */
  getRequiredProviderFamilies(): readonly string[] {
    const families = new Set<string>();

    for (const entry of this.config.resolvedModelChain.completions) {
      families.add(entry.providerFamily);
    }
    for (const entry of this.config.resolvedModelChain.embeddings) {
      families.add(entry.providerFamily);
    }

    return Array.from(families);
  }

  /**
   * Get a specific manifest by provider family.
   */
  getManifest(providerFamily: string): LLMProviderManifest | undefined {
    return this.manifests.get(providerFamily);
  }

  /**
   * Validate credentials for all providers in the chain.
   * This ensures fail-fast behavior at startup.
   */
  async validateAllCredentials(): Promise<void> {
    const families = this.getRequiredProviderFamilies();

    for (const family of families) {
      const provider = this.getProvider(family);
      await provider.validateCredentials();
    }
  }

  /**
   * Get the names of providers that require forced process exit for cleanup.
   * This method instantiates all providers if they haven't been created yet
   * to ensure we can accurately report shutdown requirements.
   */
  getProvidersRequiringProcessExit(): string[] {
    // Ensure all providers are instantiated before checking shutdown behavior
    const families = this.getRequiredProviderFamilies();
    for (const family of families) {
      this.getProvider(family);
    }

    const providersRequiringExit: string[] = [];
    for (const [family, provider] of this.providers) {
      if (provider.getShutdownBehavior() === ShutdownBehavior.REQUIRES_PROCESS_EXIT) {
        providersRequiringExit.push(family);
      }
    }
    return providersRequiringExit;
  }

  /**
   * Shutdown all active provider instances.
   */
  async shutdown(): Promise<void> {
    const shutdownPromises: Promise<void>[] = [];

    for (const [family, provider] of this.providers) {
      console.log(`ProviderManager: Shutting down provider '${family}'`);
      shutdownPromises.push(provider.close());
    }

    await Promise.all(shutdownPromises);
    this.providers.clear();
  }
}
