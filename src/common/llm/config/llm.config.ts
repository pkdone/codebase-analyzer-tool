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
  UTF8_ENCODING: "utf8",
} as const;

/**
 * LLM provider configuration
 */
export const llmProviderConfig = {
  AVERAGE_CHARS_PER_TOKEN: 3.6, // Average num of chars per token to estimate token counts from text length.
} as const;
