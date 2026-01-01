import type { LLMProviderSpecificConfig } from "../../llm-provider.types";

/**
 * Shared default configuration values for OpenAI-family LLM providers
 * (OpenAI GPT and Azure OpenAI)
 */

/**
 * Default request timeout for OpenAI API calls
 * Set to 5 minutes to accommodate long-running inference requests
 */
export const DEFAULT_OPENAI_REQUEST_TIMEOUT_MILLIS = 5 * 60 * 1000;

/**
 * Default retry configuration for OpenAI API calls
 * These values provide a balance between resilience and avoiding excessive wait times
 */
export const DEFAULT_OPENAI_MAX_RETRY_ATTEMPTS = 3;

/**
 * Default minimum delay between retries in milliseconds
 * Used as the base for exponential backoff calculations
 */
export const DEFAULT_OPENAI_MIN_RETRY_DELAY_MILLIS = 10 * 1000;

/**
 * Default maximum delay between retries in milliseconds
 * Caps the exponential backoff to avoid excessively long delays
 */
export const DEFAULT_OPENAI_MAX_RETRY_DELAY_MILLIS = 90 * 1000;

/**
 * Default provider-specific configuration for OpenAI-family LLM providers.
 * This object can be spread into provider manifests to reduce boilerplate.
 * Individual providers (e.g., Azure OpenAI) can override specific properties as needed.
 * All required fields from LLMRetryConfig are included.
 */
export const defaultOpenAIProviderConfig: Pick<
  LLMProviderSpecificConfig,
  "requestTimeoutMillis" | "maxRetryAttempts" | "minRetryDelayMillis" | "maxRetryDelayMillis"
> = {
  requestTimeoutMillis: DEFAULT_OPENAI_REQUEST_TIMEOUT_MILLIS,
  maxRetryAttempts: DEFAULT_OPENAI_MAX_RETRY_ATTEMPTS,
  minRetryDelayMillis: DEFAULT_OPENAI_MIN_RETRY_DELAY_MILLIS,
  maxRetryDelayMillis: DEFAULT_OPENAI_MAX_RETRY_DELAY_MILLIS,
} as const;
