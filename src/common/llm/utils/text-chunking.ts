import { logWarn } from "../../utils/logging";

/**
 * Default average characters per token for estimation.
 * This is a standard heuristic used across LLM providers (~3.6 chars/token for English text).
 */
const DEFAULT_AVERAGE_CHARS_PER_TOKEN = 3.6;

/**
 * Configuration for batching items based on token limits.
 */
export interface ItemBatchingConfig {
  /** Maximum total tokens available for the LLM */
  maxTokens: number;
  /** Ratio of max tokens to use per chunk (e.g., 0.7 for 70%) */
  chunkTokenLimitRatio: number;
  /** Average characters per token (for estimation). Defaults to 3.6 if not provided. */
  averageCharsPerToken?: number;
}

/**
 * Batches a list of text items into groups that fit within an LLM's token limit.
 * Preserves the integrity of individual items while grouping them into batches.
 *
 * Uses a conservative ratio of the max token limit to leave room for prompt
 * instructions and response.
 *
 * This utility is particularly useful for:
 * - Preparing large codebases for LLM processing
 * - Implementing map-reduce patterns over large text collections
 * - Ensuring prompts don't exceed token limits
 *
 * @param items - Array of text items to batch (items are preserved, not split)
 * @param config - Configuration for batching behavior
 * @returns Array of batches, where each batch is an array of items that fits within token limits
 *
 * @example
 * ```typescript
 * const summaries = ['summary1...', 'summary2...', ...];
 * const config = {
 *   maxTokens: 100000,
 *   chunkTokenLimitRatio: 0.7
 * };
 * const batches = batchItemsByTokenLimit(summaries, config);
 * console.log(`Split into ${batches.length} batches`);
 * ```
 */
export function batchItemsByTokenLimit(
  items: readonly string[],
  config: ItemBatchingConfig,
): string[][] {
  const chunks: string[][] = [];
  let currentChunk: string[] = [];
  let currentTokenCount = 0;
  const tokenLimitPerChunk = config.maxTokens * config.chunkTokenLimitRatio;
  const charsPerToken = config.averageCharsPerToken ?? DEFAULT_AVERAGE_CHARS_PER_TOKEN;

  for (const item of items) {
    // Estimate token count using character-to-token ratio
    let itemToProcess = item;
    let itemTokenCount = item.length / charsPerToken;

    // Handle items that are individually too large
    if (itemTokenCount > tokenLimitPerChunk) {
      logWarn(`A text item is too large and will be truncated to fit token limit.`);
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
    chunks.push([...items]);
  }

  return chunks;
}
