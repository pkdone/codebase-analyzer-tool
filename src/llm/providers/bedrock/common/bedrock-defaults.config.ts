/**
 * Shared default configuration values for AWS Bedrock LLM providers
 */

/**
 * Default request timeout for Bedrock API calls
 * Set to 8 minutes to accommodate long-running inference requests
 */
export const DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS = 8 * 60 * 1000;

/**
 * Default retry configuration for Bedrock API calls
 * These values provide a balance between resilience and avoiding excessive wait times
 */
export const DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS = 4;

/**
 * Default minimum delay between retries in milliseconds
 * Used as the base for exponential backoff calculations
 */
export const DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS = 25 * 1000;

/**
 * Default maximum delay between retries in milliseconds
 * Caps the exponential backoff to avoid excessively long delays
 */
export const DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS = 240 * 1000;

