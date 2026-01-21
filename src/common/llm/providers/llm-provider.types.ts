import { z } from "zod";
import type { LLMProvider } from "../types/llm-provider.interface";
import type { LLMModelMetadata } from "../types/llm-model.types";
import type { LLMErrorMsgRegExPattern } from "../types/llm-stats.types";
import type { LLMGeneratedContent, LLMResponseTokensUsage } from "../types/llm-response.types";
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
 * Initialization configuration object for LLM providers.
 * Bundles all necessary data for provider instantiation.
 */
export interface ProviderInit {
  /** The complete provider manifest */
  manifest: LLMProviderManifest;
  /** Provider-specific parameters (e.g., API keys, endpoints) */
  providerParams: Record<string, unknown>;
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
  /** Required implementation constructor */
  implementation: new (init: ProviderInit) => LLMProvider;
}

/**
 * Type to define the summary of the processed LLM implementation's response.
 */
export interface LLMImplSpecificResponseSummary {
  isIncompleteResponse: boolean;
  responseContent: LLMGeneratedContent;
  tokenUsage: LLMResponseTokensUsage;
}
