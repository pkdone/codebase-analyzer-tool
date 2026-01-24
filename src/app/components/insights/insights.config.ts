/**
 * Configuration for insights generation.
 *
 * Use 70% of max tokens to leave generous room for:
 * - Prompt template and instructions (~10-15% of tokens)
 * - LLM response output (~15-20% of tokens)
 */
export const insightsConfig = {
  CHUNK_TOKEN_LIMIT_RATIO: 0.7,
} as const;
