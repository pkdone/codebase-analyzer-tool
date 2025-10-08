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
