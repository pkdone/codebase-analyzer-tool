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

/**
 * LLM provider configuration
 */
export const llmProviderConfig = {
  MANIFEST_FILE_SUFFIX: ".manifest.js",
  PROVIDER_MANIFEST_EXPORT_SUFFIX: "ProviderManifest",
  PROVIDERS_FOLDER_PATH: "../providers",
  AVERAGE_CHARS_PER_TOKEN: 3.6,
  /**
   * Use 70% of max tokens to leave generous room for:
   * - Prompt template and instructions (~10-15% of tokens)
   * - LLM response output (~15-20% of tokens)
   */
  CHUNK_TOKEN_LIMIT_RATIO: 0.7,
} as const;
