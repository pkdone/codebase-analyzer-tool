import type { LLMProviderSpecificConfig } from "../../llm-provider.types";

/**
 * Shared default configuration values for AWS Bedrock LLM providers
 */

/**
 * Default request timeout for Bedrock API calls
 * Set to 8 minutes to accommodate long-running inference requests
 */
const DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS = 8 * 60 * 1000;

/**
 * Default retry configuration for Bedrock API calls
 * These values provide a balance between resilience and avoiding excessive wait times
 */
const DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS = 4;

/**
 * Default minimum delay between retries in milliseconds
 * Used as the base for exponential backoff calculations
 */
const DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS = 25 * 1000;

/**
 * Default maximum delay between retries in milliseconds
 * Caps the exponential backoff to avoid excessively long delays
 */
const DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS = 240 * 1000;

/**
 * Default provider-specific configuration for Bedrock LLM providers.
 * This object can be spread into provider manifests to reduce boilerplate.
 * Individual providers can override specific properties as needed.
 * All required fields from LLMRetryConfig are included.
 */
export const defaultBedrockProviderConfig: Pick<
  LLMProviderSpecificConfig,
  "requestTimeoutMillis" | "maxRetryAttempts" | "minRetryDelayMillis" | "maxRetryDelayMillis"
> = {
  requestTimeoutMillis: DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS,
  maxRetryAttempts: DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS,
  minRetryDelayMillis: DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS,
  maxRetryDelayMillis: DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS,
} as const;
