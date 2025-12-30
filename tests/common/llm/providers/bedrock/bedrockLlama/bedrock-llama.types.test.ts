import {
  isBedrockLlamaProviderConfig,
  BedrockLlamaProviderConfigSchema,
} from "../../../../../../src/common/llm/providers/bedrock/bedrockLlama/bedrock-llama.types";
import type { LLMProviderSpecificConfig } from "../../../../../../src/common/llm/providers/llm-provider.types";

describe("bedrock-llama.types", () => {
  describe("BedrockLlamaProviderConfigSchema", () => {
    it("should validate a complete valid configuration", () => {
      const config = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        maxGenLenCap: 4096,
      };
      const result = BedrockLlamaProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject configuration missing maxGenLenCap", () => {
      const config = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      };
      const result = BedrockLlamaProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject configuration with non-positive maxGenLenCap", () => {
      const config = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        maxGenLenCap: 0,
      };
      const result = BedrockLlamaProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject configuration with negative maxGenLenCap", () => {
      const config = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        maxGenLenCap: -100,
      };
      const result = BedrockLlamaProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject configuration with non-integer maxGenLenCap", () => {
      const config = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        maxGenLenCap: 4096.5,
      };
      const result = BedrockLlamaProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("isBedrockLlamaProviderConfig", () => {
    it("should return true for valid Llama provider configuration", () => {
      const config: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        maxGenLenCap: 4096,
      };
      expect(isBedrockLlamaProviderConfig(config)).toBe(true);
    });

    it("should return false for configuration missing maxGenLenCap", () => {
      const config: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      };
      expect(isBedrockLlamaProviderConfig(config)).toBe(false);
    });

    it("should return false for configuration with string maxGenLenCap", () => {
      const config = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        maxGenLenCap: "4096",
      } as unknown as LLMProviderSpecificConfig;
      expect(isBedrockLlamaProviderConfig(config)).toBe(false);
    });

    it("should return false for Claude-style config (has apiVersion but no maxGenLenCap)", () => {
      const config: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        apiVersion: "bedrock-2023-05-31",
      };
      expect(isBedrockLlamaProviderConfig(config)).toBe(false);
    });

    it("should allow extra passthrough properties", () => {
      const config: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        maxGenLenCap: 4096,
        customExtraProperty: "allowed",
      };
      expect(isBedrockLlamaProviderConfig(config)).toBe(true);
    });

    it("should return true for large maxGenLenCap values", () => {
      const config: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        maxGenLenCap: 128000,
      };
      expect(isBedrockLlamaProviderConfig(config)).toBe(true);
    });
  });
});
