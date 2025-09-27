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
  LLM_UTF8_ENCODING: "utf8",
  MIME_TYPE_JSON: "application/json",
  MIME_TYPE_ANY: "*/*",
} as const;
