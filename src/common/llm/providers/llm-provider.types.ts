import { z } from "zod";
import {
  LLMModelKeysSet,
  LLMProvider,
  LLMModelMetadata,
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
  LLMGeneratedContent,
  LLMResponseTokensUsage,
} from "../types/llm.types";
import { EnvVars } from "../../../env/env.types";

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
  /** Optional feature flags declaring special behaviors required for this provider (e.g., token caps) */
  features?: readonly string[];
  /** Provider-specific error patterns for token limits/overload */
  errorPatterns: readonly LLMErrorMsgRegExPattern[];
  /** Provider-specific operational configuration */
  providerSpecificConfig: LLMProviderSpecificConfig;
  /** Required implementation constructor (modern approach) */
  implementation: new (
    env: EnvVars,
    modelsKeysSet: LLMModelKeysSet,
    modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
    errorPatterns: readonly LLMErrorMsgRegExPattern[],
    config: { providerSpecificConfig: LLMProviderSpecificConfig },
    modelFamily: string,
    errorLogger: import("../tracking/llm-error-logger").LLMErrorLogger,
    llmFeatures?: readonly string[],
  ) => LLMProvider;
}

/**
 * Type to define the summary of the processed LLM implementation's response.
 */
export interface LLMImplSpecificResponseSummary {
  isIncompleteResponse: boolean;
  responseContent: LLMGeneratedContent;
  tokenUsage: LLMResponseTokensUsage;
}
