import { z } from "zod";
import { describe, it, expect } from "@jest/globals";
import { createProviderConfigValidator } from "../../../../../src/common/llm/providers/common/provider-config-validator";
import { LLMError, LLMErrorCode } from "../../../../../src/common/llm/types/llm-errors.types";

describe("createProviderConfigValidator", () => {
  // Test schema
  const TestConfigSchema = z.object({
    apiKey: z.string().min(1),
    endpoint: z.string().url().optional(),
    maxRetries: z.number().int().nonnegative().default(3),
  });

  const { isValid, assert } = createProviderConfigValidator(TestConfigSchema, "Test");

  describe("isValid", () => {
    it("should return true for valid config", () => {
      const config = { apiKey: "test-key" };
      expect(isValid(config)).toBe(true);
    });

    it("should return true for valid config with optional fields", () => {
      const config = {
        apiKey: "test-key",
        endpoint: "https://api.example.com",
        maxRetries: 5,
      };
      expect(isValid(config)).toBe(true);
    });

    it("should return false for null", () => {
      expect(isValid(null)).toBe(false);
    });

    it("should return false for undefined", () => {
      expect(isValid(undefined)).toBe(false);
    });

    it("should return false for non-object", () => {
      expect(isValid("string")).toBe(false);
      expect(isValid(123)).toBe(false);
      expect(isValid(true)).toBe(false);
    });

    it("should return false for missing required fields", () => {
      const config = { endpoint: "https://api.example.com" };
      expect(isValid(config)).toBe(false);
    });

    it("should return false for empty required string", () => {
      const config = { apiKey: "" };
      expect(isValid(config)).toBe(false);
    });

    it("should return false for invalid field types", () => {
      const config = { apiKey: "test-key", maxRetries: "not-a-number" };
      expect(isValid(config)).toBe(false);
    });

    it("should return false for invalid URL format", () => {
      const config = { apiKey: "test-key", endpoint: "not-a-url" };
      expect(isValid(config)).toBe(false);
    });
  });

  describe("assert", () => {
    it("should return validated config for valid input", () => {
      const config = { apiKey: "test-key" };
      const result = assert(config);
      expect(result.apiKey).toBe("test-key");
    });

    it("should apply defaults when fields are missing", () => {
      const config = { apiKey: "test-key" };
      const result = assert(config);
      expect(result.maxRetries).toBe(3);
    });

    it("should preserve optional fields when provided", () => {
      const config = {
        apiKey: "test-key",
        endpoint: "https://api.example.com",
        maxRetries: 10,
      };
      const result = assert(config);
      expect(result.endpoint).toBe("https://api.example.com");
      expect(result.maxRetries).toBe(10);
    });

    it("should throw LLMError for null input", () => {
      expect(() => assert(null)).toThrow(LLMError);
      try {
        assert(null);
      } catch (error) {
        expect(error).toBeInstanceOf(LLMError);
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
        expect((error as Error).message).toContain("Invalid Test configuration");
        expect((error as Error).message).toContain("expected an object");
      }
    });

    it("should throw LLMError for undefined input", () => {
      expect(() => assert(undefined)).toThrow(LLMError);
      try {
        assert(undefined);
      } catch (error) {
        expect((error as LLMError).code).toBe(LLMErrorCode.BAD_CONFIGURATION);
      }
    });

    it("should throw LLMError with field-level errors for missing required fields", () => {
      const config = { endpoint: "https://api.example.com" };
      expect(() => assert(config)).toThrow(LLMError);
      try {
        assert(config);
      } catch (error) {
        expect((error as Error).message).toContain("Invalid Test configuration");
        expect((error as Error).message).toContain("apiKey");
      }
    });

    it("should throw LLMError with field-level errors for invalid types", () => {
      const config = { apiKey: "test-key", maxRetries: -5 };
      expect(() => assert(config)).toThrow(LLMError);
      try {
        assert(config);
      } catch (error) {
        expect((error as Error).message).toContain("maxRetries");
      }
    });

    it("should throw LLMError with multiple field errors", () => {
      const config = { apiKey: "", maxRetries: -1 };
      expect(() => assert(config)).toThrow(LLMError);
      try {
        assert(config);
      } catch (error) {
        // Should contain both field errors
        expect((error as Error).message).toContain("apiKey");
        expect((error as Error).message).toContain("maxRetries");
      }
    });
  });

  describe("type narrowing", () => {
    it("should narrow type after isValid check", () => {
      const maybeConfig: unknown = { apiKey: "test-key" };

      if (isValid(maybeConfig)) {
        // TypeScript should recognize maybeConfig as TestConfig
        expect(maybeConfig.apiKey).toBe("test-key");
      }
    });

    it("should return typed config from assert", () => {
      const maybeConfig: unknown = { apiKey: "test-key" };
      const config = assert(maybeConfig);
      expect(config.apiKey).toBe("test-key");
    });
  });

  describe("with nested schema", () => {
    const NestedConfigSchema = z.object({
      apiKey: z.string().min(1),
      options: z.object({
        timeout: z.number().positive(),
        retries: z.number().nonnegative(),
      }),
    });

    const { isValid: isNestedValid, assert: assertNested } = createProviderConfigValidator(
      NestedConfigSchema,
      "Nested",
    );

    it("should validate nested objects", () => {
      const config = {
        apiKey: "test-key",
        options: { timeout: 5000, retries: 3 },
      };
      expect(isNestedValid(config)).toBe(true);
    });

    it("should report nested field errors", () => {
      const config = {
        apiKey: "test-key",
        options: { timeout: -1, retries: 3 },
      };
      expect(() => assertNested(config)).toThrow(LLMError);
      try {
        assertNested(config);
      } catch (error) {
        expect((error as Error).message).toContain("options.timeout");
      }
    });
  });
});
