import {
  isBedrockClaudeProviderConfig,
  BedrockClaudeProviderConfigSchema,
} from "../../../../../../src/common/llm/providers/bedrock/bedrockClaude/bedrock-claude.types";
import type { LLMProviderSpecificConfig } from "../../../../../../src/common/llm/providers/llm-provider.types";

describe("bedrock-claude.types", () => {
  describe("BedrockClaudeProviderConfigSchema", () => {
    it("should validate a complete valid configuration", () => {
      const config = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        apiVersion: "bedrock-2023-05-31",
        temperature: 0.0,
        topP: 0.9,
        topK: 1,
        anthropicBetaFlags: ["context-1m-2025-08-07"],
      };
      const result = BedrockClaudeProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should validate configuration without optional fields", () => {
      const config = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        apiVersion: "bedrock-2023-05-31",
      };
      const result = BedrockClaudeProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(true);
    });

    it("should reject configuration missing required apiVersion", () => {
      const config = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      };
      const result = BedrockClaudeProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject configuration with empty apiVersion", () => {
      const config = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        apiVersion: "",
      };
      const result = BedrockClaudeProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });

    it("should reject configuration with invalid timeout value", () => {
      const config = {
        requestTimeoutMillis: -1,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        apiVersion: "bedrock-2023-05-31",
      };
      const result = BedrockClaudeProviderConfigSchema.safeParse(config);
      expect(result.success).toBe(false);
    });
  });

  describe("isBedrockClaudeProviderConfig", () => {
    it("should return true for valid Claude provider configuration", () => {
      const config: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        apiVersion: "bedrock-2023-05-31",
      };
      expect(isBedrockClaudeProviderConfig(config)).toBe(true);
    });

    it("should return true for configuration with anthropicBetaFlags", () => {
      const config: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        apiVersion: "bedrock-2023-05-31",
        anthropicBetaFlags: ["context-1m-2025-08-07"],
      };
      expect(isBedrockClaudeProviderConfig(config)).toBe(true);
    });

    it("should return false for configuration missing apiVersion", () => {
      const config: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      };
      expect(isBedrockClaudeProviderConfig(config)).toBe(false);
    });

    it("should return false for configuration with non-string apiVersion", () => {
      const config = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        apiVersion: 123,
      } as unknown as LLMProviderSpecificConfig;
      expect(isBedrockClaudeProviderConfig(config)).toBe(false);
    });

    it("should return false for minimal base config without Claude-specific fields", () => {
      const config: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      };
      expect(isBedrockClaudeProviderConfig(config)).toBe(false);
    });

    it("should allow extra passthrough properties", () => {
      const config: LLMProviderSpecificConfig = {
        requestTimeoutMillis: 30000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        apiVersion: "bedrock-2023-05-31",
        customExtraProperty: "allowed",
      };
      expect(isBedrockClaudeProviderConfig(config)).toBe(true);
    });
  });
});
