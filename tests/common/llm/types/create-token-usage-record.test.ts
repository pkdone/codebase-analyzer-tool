import { createTokenUsageRecord } from "../../../../src/common/llm/types/llm-response.types";

describe("createTokenUsageRecord", () => {
  describe("default values", () => {
    it("should return all undefined values when called with no arguments", () => {
      const result = createTokenUsageRecord();

      expect(result).toEqual({
        promptTokens: undefined,
        completionTokens: undefined,
        maxTotalTokens: undefined,
      });
    });

    it("should return all undefined values when called with all undefined", () => {
      const result = createTokenUsageRecord(undefined, undefined, undefined);

      expect(result).toEqual({
        promptTokens: undefined,
        completionTokens: undefined,
        maxTotalTokens: undefined,
      });
    });
  });

  describe("with provided values", () => {
    it("should use provided promptTokens value", () => {
      const result = createTokenUsageRecord(100);

      expect(result.promptTokens).toBe(100);
      expect(result.completionTokens).toBeUndefined();
      expect(result.maxTotalTokens).toBeUndefined();
    });

    it("should use provided promptTokens and completionTokens values", () => {
      const result = createTokenUsageRecord(100, 50);

      expect(result.promptTokens).toBe(100);
      expect(result.completionTokens).toBe(50);
      expect(result.maxTotalTokens).toBeUndefined();
    });

    it("should use all provided values", () => {
      const result = createTokenUsageRecord(100, 50, 8192);

      expect(result).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      });
    });
  });

  describe("partial values", () => {
    it("should handle undefined in the middle position", () => {
      const result = createTokenUsageRecord(100, undefined, 8192);

      expect(result.promptTokens).toBe(100);
      expect(result.completionTokens).toBeUndefined();
      expect(result.maxTotalTokens).toBe(8192);
    });

    it("should handle undefined as first argument with values for others", () => {
      const result = createTokenUsageRecord(undefined, 50, 8192);

      expect(result.promptTokens).toBeUndefined();
      expect(result.completionTokens).toBe(50);
      expect(result.maxTotalTokens).toBe(8192);
    });
  });

  describe("edge cases", () => {
    it("should handle zero values correctly (zero is valid)", () => {
      const result = createTokenUsageRecord(0, 0, 0);

      expect(result).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        maxTotalTokens: 0,
      });
    });

    it("should handle large token counts", () => {
      const result = createTokenUsageRecord(1_000_000, 500_000, 2_000_000);

      expect(result).toEqual({
        promptTokens: 1_000_000,
        completionTokens: 500_000,
        maxTotalTokens: 2_000_000,
      });
    });

    it("should return readonly properties", () => {
      const result = createTokenUsageRecord(100, 50, 8192);

      // Verify the return type matches LLMResponseTokensUsage interface
      expect(Object.isFrozen(result)).toBe(false); // Plain object, not frozen
      expect(result).toHaveProperty("promptTokens");
      expect(result).toHaveProperty("completionTokens");
      expect(result).toHaveProperty("maxTotalTokens");
    });
  });

  describe("type inference", () => {
    it("should return an object that satisfies LLMResponseTokensUsage", () => {
      const result = createTokenUsageRecord(100, 50, 8192);

      // These assertions verify the shape matches the interface
      // Values are optional numbers, so we check if defined before asserting type
      expect(result.promptTokens).toBeDefined();
      expect(result.completionTokens).toBeDefined();
      expect(result.maxTotalTokens).toBeDefined();

      if (result.promptTokens !== undefined) {
        expect(typeof result.promptTokens).toBe("number");
      }
      if (result.completionTokens !== undefined) {
        expect(typeof result.completionTokens).toBe("number");
      }
      if (result.maxTotalTokens !== undefined) {
        expect(typeof result.maxTotalTokens).toBe("number");
      }
    });

    it("should return undefined for unknown token values (not sentinel values)", () => {
      // This documents the change from -1 sentinel values to undefined
      const result = createTokenUsageRecord();

      expect(result.promptTokens).toBeUndefined();
      expect(result.completionTokens).toBeUndefined();
      expect(result.maxTotalTokens).toBeUndefined();
    });
  });
});
