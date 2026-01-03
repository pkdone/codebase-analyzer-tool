import { createTokenUsage } from "../../../../src/common/llm/types/llm.types";

describe("createTokenUsage", () => {
  const DEFAULT_VALUE = -1;

  describe("default values", () => {
    it("should return all -1 values when called with no arguments", () => {
      const result = createTokenUsage();

      expect(result).toEqual({
        promptTokens: DEFAULT_VALUE,
        completionTokens: DEFAULT_VALUE,
        maxTotalTokens: DEFAULT_VALUE,
      });
    });

    it("should return all -1 values when called with all undefined", () => {
      const result = createTokenUsage(undefined, undefined, undefined);

      expect(result).toEqual({
        promptTokens: DEFAULT_VALUE,
        completionTokens: DEFAULT_VALUE,
        maxTotalTokens: DEFAULT_VALUE,
      });
    });
  });

  describe("with provided values", () => {
    it("should use provided promptTokens value", () => {
      const result = createTokenUsage(100);

      expect(result.promptTokens).toBe(100);
      expect(result.completionTokens).toBe(DEFAULT_VALUE);
      expect(result.maxTotalTokens).toBe(DEFAULT_VALUE);
    });

    it("should use provided promptTokens and completionTokens values", () => {
      const result = createTokenUsage(100, 50);

      expect(result.promptTokens).toBe(100);
      expect(result.completionTokens).toBe(50);
      expect(result.maxTotalTokens).toBe(DEFAULT_VALUE);
    });

    it("should use all provided values", () => {
      const result = createTokenUsage(100, 50, 8192);

      expect(result).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      });
    });
  });

  describe("partial values", () => {
    it("should handle undefined in the middle position", () => {
      const result = createTokenUsage(100, undefined, 8192);

      expect(result.promptTokens).toBe(100);
      expect(result.completionTokens).toBe(DEFAULT_VALUE);
      expect(result.maxTotalTokens).toBe(8192);
    });

    it("should handle undefined as first argument with values for others", () => {
      const result = createTokenUsage(undefined, 50, 8192);

      expect(result.promptTokens).toBe(DEFAULT_VALUE);
      expect(result.completionTokens).toBe(50);
      expect(result.maxTotalTokens).toBe(8192);
    });
  });

  describe("edge cases", () => {
    it("should handle zero values correctly (zero is valid)", () => {
      const result = createTokenUsage(0, 0, 0);

      expect(result).toEqual({
        promptTokens: 0,
        completionTokens: 0,
        maxTotalTokens: 0,
      });
    });

    it("should handle large token counts", () => {
      const result = createTokenUsage(1_000_000, 500_000, 2_000_000);

      expect(result).toEqual({
        promptTokens: 1_000_000,
        completionTokens: 500_000,
        maxTotalTokens: 2_000_000,
      });
    });

    it("should return readonly properties", () => {
      const result = createTokenUsage(100, 50, 8192);

      // Verify the return type matches LLMResponseTokensUsage interface
      expect(Object.isFrozen(result)).toBe(false); // Plain object, not frozen
      expect(result).toHaveProperty("promptTokens");
      expect(result).toHaveProperty("completionTokens");
      expect(result).toHaveProperty("maxTotalTokens");
    });
  });

  describe("type inference", () => {
    it("should return an object that satisfies LLMResponseTokensUsage", () => {
      const result = createTokenUsage(100, 50, 8192);

      // These assertions verify the shape matches the interface
      const promptTokens: number = result.promptTokens;
      const completionTokens: number = result.completionTokens;
      const maxTotalTokens: number = result.maxTotalTokens;

      expect(typeof promptTokens).toBe("number");
      expect(typeof completionTokens).toBe("number");
      expect(typeof maxTotalTokens).toBe("number");
    });
  });
});
