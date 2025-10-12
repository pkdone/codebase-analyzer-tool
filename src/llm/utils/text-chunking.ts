import { llmProviderConfig } from "../llm.config";
import { logWarningMsg } from "../../common/utils/logging";

/**
 * Configuration for text chunking based on token limits
 */
export interface TextChunkingConfig {
  /** Maximum total tokens available for the LLM */
  maxTokens: number;
  /** Ratio of max tokens to use per chunk (e.g., 0.7 for 70%) */
  chunkTokenLimitRatio: number;
  /** Average characters per token (for estimation) */
  averageCharsPerToken?: number;
}

/**
 * Splits a list of text items into chunks that fit within an LLM's token limit.
 * Uses a conservative ratio of the max token limit to leave room for prompt instructions and response.
 *
 * This utility is particularly useful for:
 * - Preparing large codebases for LLM processing
 * - Implementing map-reduce patterns over large text collections
 * - Ensuring prompts don't exceed token limits
 *
 * @param items - Array of text items to chunk
 * @param config - Configuration for chunking behavior
 * @returns Array of arrays, where each inner array is a chunk that fits within token limits
 *
 * @example
 * ```typescript
 * const summaries = ['summary1...', 'summary2...', ...];
 * const config = {
 *   maxTokens: 100000,
 *   chunkTokenLimitRatio: 0.7
 * };
 * const chunks = chunkTextByTokenLimit(summaries, config);
 * console.log(`Split into ${chunks.length} chunks`);
 * ```
 */
export function chunkTextByTokenLimit(items: string[], config: TextChunkingConfig): string[][] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentTokenCount = 0;
  const tokenLimitPerChunk = config.maxTokens * config.chunkTokenLimitRatio;
  const charsPerToken = config.averageCharsPerToken ?? llmProviderConfig.AVERAGE_CHARS_PER_TOKEN;

  for (const item of items) {
    // Estimate token count using character-to-token ratio
    let itemToProcess = item;
    let itemTokenCount = item.length / charsPerToken;

    // Handle items that are individually too large
    if (itemTokenCount > tokenLimitPerChunk) {
      logWarningMsg(`A text item is too large and will be truncated to fit token limit.`);
      const truncatedLength = Math.floor(tokenLimitPerChunk * charsPerToken);
      itemToProcess = item.substring(0, truncatedLength);
      itemTokenCount = tokenLimitPerChunk;
    }

    // If adding this item would exceed the limit, start a new chunk
    if (currentTokenCount + itemTokenCount > tokenLimitPerChunk && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokenCount = 0;
    }

    currentChunk.push(itemToProcess);
    currentTokenCount += itemTokenCount;
  }

  // Add the last chunk if it has any content
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  // Edge case: if no chunks were created but we have items, force a single chunk
  if (chunks.length === 0 && items.length > 0) {
    chunks.push(items);
  }

  return chunks;
}

