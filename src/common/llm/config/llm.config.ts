import { ENCODING_UTF8 } from "../../constants";

/**
 * LLM (Large Language Model) configuration.
 */
export const llmConfig = {
  LLM_ROLE_USER: "user",
  LLM_ROLE_ASSISTANT: "assistant",
  LLM_ROLE_SYSTEM: "system",
  COMPLETION_MAX_TOKENS_LIMIT_BUFFER: 5,
  MAX_COMPLETION_REDUCTION_RATIO: 0.75,
  MAX_PROMPT_REDUCTION_RATIO: 0.85,
  DEFAULT_ZERO_TEMP: 0,
  DEFAULT_TOP_P_LOWEST: 0,
  DEFAULT_TOP_K_LOWEST: 1,
  JSON_OUTPUT_TYPE: "json_object",
  // HTTP/MIME constants for LLM provider interactions
  MIME_TYPE_JSON: "application/json",
  MIME_TYPE_ANY: "*/*",
  UTF8_ENCODING: ENCODING_UTF8,
  /**
   * Default average characters per token for estimation.
   * Standard heuristic used across LLM providers (~3.6 chars/token for English text).
   */
  AVERAGE_CHARS_PER_TOKEN: 3.6,
  /**
   * Default fallback for maximum tokens when model metadata is unavailable.
   * Based on common large context window models (128K tokens).
   */
  DEFAULT_MAX_TOKENS_FALLBACK: 128000,
} as const;

/**
 * Default retry and timeout configuration for LLM providers.
 * Providers should spread this base config and override only what is specific to them.
 * This ensures consistent baseline behavior across all providers while allowing
 * provider-specific tuning where needed.
 */
export const DEFAULT_PROVIDER_CONFIG = {
  /** Default request timeout in milliseconds (5 minutes) */
  requestTimeoutMillis: 5 * 60 * 1000,
  /** Default maximum retry attempts for transient failures */
  maxRetryAttempts: 3,
  /** Default minimum delay between retries in milliseconds (10 seconds) */
  minRetryDelayMillis: 10 * 1000,
  /** Default maximum delay between retries in milliseconds (90 seconds) */
  maxRetryDelayMillis: 90 * 1000,
} as const;
