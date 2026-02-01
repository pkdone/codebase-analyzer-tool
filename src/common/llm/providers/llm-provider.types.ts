import { z } from "zod";
import type { LLMProvider } from "../types/llm-provider.interface";
import type { LLMModelMetadata } from "../types/llm-model.types";
import type { LLMErrorMsgRegExPattern } from "../types/llm-stats.types";
import type { LLMResponsePayload, LLMResponseTokensUsage } from "../types/llm-response.types";
import type { LLMErrorLoggingConfig, ResolvedModelChain } from "../config/llm-module-config.types";
import type { JsonValue } from "../types/json-value.types";

/**
 * Interface for retry and timeout configuration used by LLMRouter
 */
export interface LLMRetryConfig {
  /** Request timeout in milliseconds */
  requestTimeoutMillis: number;
  /** Number of retry attempts for failed requests */
  maxRetryAttempts: number;
  /** Minimum delay between retries in milliseconds */
  minRetryDelayMillis: number;
  /** Maximum delay between retries in milliseconds */
  maxRetryDelayMillis: number;
}

/**
 * Interface for provider-specific operational parameters that can be configured
 * without code changes in the core LLM logic files.
 * Uses JsonValue constraint for the index signature to ensure all config
 * values are JSON-serializable, while still allowing provider flexibility.
 */
export interface LLMProviderSpecificConfig extends LLMRetryConfig {
  /** Any other provider-specific configuration (must be JSON-serializable) */
  [key: string]: JsonValue | undefined;
  /** API version or similar version identifiers */
  apiVersion?: string;
  /** Default temperature for completions */
  temperature?: number;
  /** Default topP for completions */
  topP?: number;
  /** Default topK for completions */
  topK?: number;
  /** Safety settings for providers that support them */
  safetySettings?: Record<string, JsonValue>;
}

/**
 * Typed provider configuration extracted from environment variables.
 * Each provider defines its own config interface; this is the base constraint.
 * Uses unknown to allow any object shape - providers are responsible for
 * validating the config structure at runtime via type guards.
 */
export type ExtractedProviderConfig = Record<string, unknown>;

/**
 * Function type for extracting typed provider configuration from raw environment params.
 * This decouples providers from specific environment variable names.
 * Returns ExtractedProviderConfig to allow any provider-specific config shape.
 */
export type ProviderConfigExtractor = (
  providerParams: Record<string, unknown>,
) => ExtractedProviderConfig;

/**
 * Initialization configuration object for LLM providers.
 * Bundles all necessary data for provider instantiation.
 */
export interface ProviderInit {
  /** The complete provider manifest */
  manifest: LLMProviderManifest;
  /** Provider-specific parameters (e.g., API keys, endpoints) - raw from environment */
  providerParams: Record<string, unknown>;
  /** Extracted and typed provider configuration - decouples providers from env var names */
  extractedConfig: ExtractedProviderConfig;
  /** Resolved model chain entries for models from this provider */
  resolvedModelChain: ResolvedModelChain;
  /** Error logging configuration for recording JSON processing issues */
  errorLogging: LLMErrorLoggingConfig;
}

/**
 * Complete manifest defining a provider's configuration.
 * Each provider declares the models it supports; actual usage is determined
 * by the model chain configuration in environment variables.
 */
export interface LLMProviderManifest {
  /** Unique identifier for the provider family (e.g., "VertexAIGemini", "AzureOpenAI") */
  providerFamily: string;
  /** Zod schema for provider-specific environment variables (authentication only) */
  envSchema: z.ZodObject<z.ZodRawShape>;
  /** Model configurations available from this provider */
  models: {
    /** Available embedding models (typically 1, but supports multiple) */
    embeddings: readonly LLMModelMetadata[];
    /** Available completion models */
    completions: readonly LLMModelMetadata[];
  };
  /** Provider-specific error patterns for token limits/overload */
  errorPatterns: readonly LLMErrorMsgRegExPattern[];
  /** Provider-specific operational configuration */
  providerSpecificConfig: LLMProviderSpecificConfig;
  /**
   * Extracts typed provider configuration from raw environment parameters.
   * This decouples provider implementations from specific environment variable names,
   * allowing different projects to use different naming conventions.
   */
  extractConfig: ProviderConfigExtractor;
  /** Required implementation constructor */
  implementation: new (init: ProviderInit) => LLMProvider;
}

/**
 * Type to define the summary of the processed LLM implementation's response.
 */
export interface LLMImplSpecificResponseSummary {
  isIncompleteResponse: boolean;
  responseContent: LLMResponsePayload;
  tokenUsage: LLMResponseTokensUsage;
}
