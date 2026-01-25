import { batchItemsByTokenLimit } from "../../../../src/common/llm/utils/text-chunking";

describe("text-chunking", () => {
  describe("batchItemsByTokenLimit", () => {
    const baseConfig = {
      maxTokens: 100,
      chunkTokenLimitRatio: 0.7,
      averageCharsPerToken: 4,
    };

    test("should return single batch for small input", () => {
      const items = ["short text", "another short text"];
      const result = batchItemsByTokenLimit(items, baseConfig);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(items);
    });

    test("should split into multiple batches when exceeding token limit", () => {
      // Each item is ~70 chars = ~17.5 tokens
      // With 70% of 100 tokens = 70 tokens per batch, should fit 4 items per batch
      const item = "A".repeat(70);
      const items = [item, item, item, item, item, item, item, item]; // 8 items

      const result = batchItemsByTokenLimit(items, baseConfig);

      expect(result.length).toBeGreaterThan(1);
      expect(result.flat()).toHaveLength(8);
    });

    test("should handle items that individually exceed token limit", () => {
      // Create an item larger than the batch limit
      const largeItem = "X".repeat(400); // 400 chars = 100 tokens > 70 token limit
      const items = [largeItem, "small"];

      const result = batchItemsByTokenLimit(items, baseConfig);

      // Should have 2 batches: truncated large item and small item
      expect(result).toHaveLength(2);
      expect(result[0][0].length).toBeLessThan(largeItem.length);
      expect(result[1]).toEqual(["small"]);
    });

    test("should handle empty input", () => {
      const result = batchItemsByTokenLimit([], baseConfig);

      expect(result).toEqual([]);
    });

    test("should handle single item input", () => {
      const items = ["single item"];
      const result = batchItemsByTokenLimit(items, baseConfig);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(items);
    });

    test("should respect custom averageCharsPerToken", () => {
      const customConfig = {
        maxTokens: 100,
        chunkTokenLimitRatio: 0.7,
        averageCharsPerToken: 2, // More sensitive to character count
      };

      const item = "A".repeat(100); // 100 chars = 50 tokens with custom ratio
      const items = [item, item]; // 100 tokens total, exceeds 70 token limit

      const result = batchItemsByTokenLimit(items, customConfig);

      expect(result.length).toBeGreaterThan(1);
    });

    test("should use default averageCharsPerToken when not provided", () => {
      const configWithoutCharsPerToken = {
        maxTokens: 100,
        chunkTokenLimitRatio: 0.7,
      };

      const items = ["text"];
      const result = batchItemsByTokenLimit(items, configWithoutCharsPerToken);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(items);
    });

    test("should not split when items fit exactly within limit", () => {
      const config = {
        maxTokens: 100,
        chunkTokenLimitRatio: 1.0, // Use full token limit
        averageCharsPerToken: 4,
      };

      // Create items that fit exactly: 100 tokens = 400 chars
      const items = ["A".repeat(200), "B".repeat(200)]; // 400 chars total = 100 tokens

      const result = batchItemsByTokenLimit(items, config);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(items);
    });

    test("should handle very small token limits", () => {
      const config = {
        maxTokens: 10,
        chunkTokenLimitRatio: 0.5, // 5 tokens per batch
        averageCharsPerToken: 4,
      };

      const items = ["A".repeat(20), "B".repeat(20), "C".repeat(20)]; // Each ~5 tokens

      const result = batchItemsByTokenLimit(items, config);

      // Each item should be in its own batch
      expect(result.length).toBeGreaterThan(1);
    });

    test("should preserve order of items", () => {
      const items = ["first", "second", "third", "fourth"];
      const result = batchItemsByTokenLimit(items, baseConfig);

      const flattened = result.flat();
      expect(flattened).toEqual(items);
    });
  });
});
