import { z } from "zod";
import {
  LLMProvider,
  LLMModelMetadata,
  LLMErrorMsgRegExPattern,
  LLMGeneratedContent,
  LLMResponseTokensUsage,
} from "../types/llm.types";
import type { ResolvedModels } from "../config/llm-module-config.types";
import type { IErrorLogger } from "../tracking/llm-error-logger.interface";

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
 */
export interface LLMProviderSpecificConfig extends LLMRetryConfig {
  /** Any other provider-specific configuration */
  [key: string]: unknown;
  /** API version or similar version identifiers */
  apiVersion?: string;
  /** Default temperature for completions */
  temperature?: number;
  /** Default topP for completions */
  topP?: number;
  /** Default topK for completions */
  topK?: number;
  /** Safety settings for providers that support them */
  safetySettings?: Record<string, unknown>;
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
  /** Resolved model URNs for this provider */
  resolvedModels: ResolvedModels;
  /** Error logger for recording issues */
  errorLogger: IErrorLogger;
}

/**
 * Complete manifest defining a provider's configuration
 */
export interface LLMProviderManifest {
  /** User-friendly name for the provider */
  providerName: string;
  /** Unique identifier for the provider/family - changed to string to decouple from ModelFamily enum */
  modelFamily: string;
  /** Zod schema for provider-specific environment variables */
  envSchema: z.ZodObject<z.ZodRawShape>;
  /** Model configurations for this provider */
  models: {
    embeddings: LLMModelMetadata;
    primaryCompletion: LLMModelMetadata;
    secondaryCompletion?: LLMModelMetadata;
  };
  /** Provider-specific error patterns for token limits/overload */
  errorPatterns: readonly LLMErrorMsgRegExPattern[];
  /** Provider-specific operational configuration */
  providerSpecificConfig: LLMProviderSpecificConfig;
  /** Required implementation constructor (modern approach) */
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
