/**
 * Configuration types for the LLM module.
 * These types define the configuration contract that makes the LLM module
 * standalone and independent of any specific DI framework or application structure.
 */

import type { LLMProviderManifest } from "../providers/llm-provider.types";
import type { ModelChainEntry, ResolvedModelChain } from "../types/llm-model.types";

// Re-export sanitizer config types for convenience
export type { LLMSanitizerConfig, ReplacementRule } from "../types/sanitizer-config.types";

/**
 * Registry mapping provider family identifiers to their manifests.
 * This type is used to inject the set of available providers at runtime,
 * allowing consuming applications to control which providers are included.
 */
export type LLMProviderRegistry = ReadonlyMap<string, LLMProviderManifest>;

// Re-export for convenience
export type { ModelChainEntry, ResolvedModelChain };

/**
 * Configuration for error logging behavior.
 */
export interface LLMErrorLoggingConfig {
  readonly errorLogDirectory: string;
  readonly errorLogFilenameTemplate: string;
}

/**
 * Main configuration object for the LLM module.
 * This is the primary interface that consuming applications use to configure
 * the LLM module for their specific needs.
 *
 * All environment-specific values should be resolved by the application layer
 * before passing to the LLM module.
 */
export interface LLMModuleConfig {
  /** Error logging configuration */
  readonly errorLogging: LLMErrorLoggingConfig;
  /** Provider-specific parameters (e.g., API keys, endpoints) for all providers in use */
  readonly providerParams: Record<string, unknown>;
  /** Resolved model chain for completions and embeddings */
  readonly resolvedModelChain: ResolvedModelChain;
  /**
   * Registry of available LLM provider manifests.
   * The application layer is responsible for constructing this registry
   * with the specific providers it intends to use.
   */
  readonly providerRegistry: LLMProviderRegistry;
}
