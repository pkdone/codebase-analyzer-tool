import "reflect-metadata";
import { describe, test, expect } from "@jest/globals";
import { normalizeTokenUsage } from "../../../../src/common/llm/utils/token-usage-normalizer";
import type { LLMResponseTokensUsage } from "../../../../src/common/llm/types/llm-response.types";
import type { ResolvedLLMModelMetadata } from "../../../../src/common/llm/types/llm-model.types";
import { LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import { llmConfig } from "../../../../src/common/llm/config/llm.config";

describe("normalizeTokenUsage", () => {
  const createModelMetadata = (
    maxTotalTokens: number,
    maxCompletionTokens?: number,
  ): Record<string, ResolvedLLMModelMetadata> => ({
    "test-model": {
      modelKey: "test-model",
      purpose: LLMPurpose.COMPLETIONS,
      urnEnvKey: "TEST_MODEL_URN",
      urn: "test-model-urn",
      maxTotalTokens,
      maxCompletionTokens,
    },
  });

  describe("completion tokens normalization", () => {
    test("should default completion tokens to 0 when unknown (negative value)", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: 100,
        completionTokens: -1,
        maxTotalTokens: 8192,
      };

      const result = normalizeTokenUsage(
        "test-model",
        tokenUsage,
        createModelMetadata(8192),
        "test request",
      );

      expect(result.completionTokens).toBe(0);
    });

    test("should preserve completion tokens when already known", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: 100,
        completionTokens: 500,
        maxTotalTokens: 8192,
      };

      const result = normalizeTokenUsage(
        "test-model",
        tokenUsage,
        createModelMetadata(8192),
        "test request",
      );

      expect(result.completionTokens).toBe(500);
    });
  });

  describe("max total tokens normalization", () => {
    test("should resolve max total tokens from model metadata when unknown (negative value)", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: -1,
      };

      const result = normalizeTokenUsage(
        "test-model",
        tokenUsage,
        createModelMetadata(16384),
        "test request",
      );

      expect(result.maxTotalTokens).toBe(16384);
    });

    test("should preserve max total tokens when already known", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      };

      const result = normalizeTokenUsage(
        "test-model",
        tokenUsage,
        createModelMetadata(16384), // Different from tokenUsage
        "test request",
      );

      expect(result.maxTotalTokens).toBe(8192);
    });
  });

  describe("prompt tokens estimation", () => {
    test("should estimate prompt tokens when unknown and ensure they exceed limit for cropping", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: -1,
        completionTokens: 50,
        maxTotalTokens: 8192,
      };

      // Short request - estimated tokens should be less than limit, so Math.max ensures limit+1
      const shortRequest = "short test request";
      const result = normalizeTokenUsage(
        "test-model",
        tokenUsage,
        createModelMetadata(8192),
        shortRequest,
      );

      // Should use Math.max(estimated, maxTotalTokens + 1) = 8193
      // because estimated = floor(18 / 3.6) = 5 < 8193
      expect(result.promptTokens).toBe(8193);
    });

    test("should use estimated tokens when they exceed the limit", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: -1,
        completionTokens: 50,
        maxTotalTokens: 100,
      };

      // Long request with more chars than 100 * 3.6 = 360 chars
      // Create a request that estimates to more than 101 tokens
      const longRequest = "a".repeat(500); // 500 / 3.6 ≈ 138 tokens
      const result = normalizeTokenUsage(
        "test-model",
        tokenUsage,
        createModelMetadata(100),
        longRequest,
      );

      const expectedEstimate = Math.floor(500 / llmConfig.AVERAGE_CHARS_PER_TOKEN);
      expect(result.promptTokens).toBe(expectedEstimate); // 138 > 101, so use 138
    });

    test("should preserve prompt tokens when already known", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: 1000,
        completionTokens: 50,
        maxTotalTokens: 8192,
      };

      const result = normalizeTokenUsage(
        "test-model",
        tokenUsage,
        createModelMetadata(8192),
        "test request",
      );

      expect(result.promptTokens).toBe(1000);
    });
  });

  describe("combined normalization", () => {
    test("should normalize all unknown values simultaneously", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: -1,
        completionTokens: -1,
        maxTotalTokens: -1,
      };

      const result = normalizeTokenUsage(
        "test-model",
        tokenUsage,
        createModelMetadata(4096),
        "test request",
      );

      expect(result.completionTokens).toBe(0);
      expect(result.maxTotalTokens).toBe(4096);
      // Math.max(floor(12 / 3.6), 4096 + 1) = Math.max(3, 4097) = 4097
      expect(result.promptTokens).toBe(4097);
    });

    test("should return immutable-like result (new object)", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      };

      const result = normalizeTokenUsage(
        "test-model",
        tokenUsage,
        createModelMetadata(8192),
        "test request",
      );

      expect(result).not.toBe(tokenUsage);
      expect(result).toEqual({
        promptTokens: 100,
        completionTokens: 50,
        maxTotalTokens: 8192,
      });
    });
  });

  describe("edge cases", () => {
    test("should handle empty request string", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: -1,
        completionTokens: -1,
        maxTotalTokens: -1,
      };

      const result = normalizeTokenUsage("test-model", tokenUsage, createModelMetadata(1000), "");

      // Empty string has 0 chars, estimated = floor(0 / 3.6) = 0
      // Math.max(0, 1001) = 1001
      expect(result.promptTokens).toBe(1001);
    });

    test("should handle very large request content", () => {
      const tokenUsage: LLMResponseTokensUsage = {
        promptTokens: -1,
        completionTokens: 0,
        maxTotalTokens: 100,
      };

      // Very large request: 1 million chars ≈ 277,777 tokens
      const largeRequest = "x".repeat(1_000_000);
      const result = normalizeTokenUsage(
        "test-model",
        tokenUsage,
        createModelMetadata(100),
        largeRequest,
      );

      const expectedEstimate = Math.floor(1_000_000 / llmConfig.AVERAGE_CHARS_PER_TOKEN);
      expect(result.promptTokens).toBe(expectedEstimate);
      expect(result.promptTokens).toBeGreaterThan(100);
    });
  });
});
