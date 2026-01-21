import { coreTokens, llmTokens, configTokens } from "../../../src/app/di/tokens";

/**
 * Unit tests to verify that unused tokens have been removed from the DI container.
 * These tests ensure that cleanup recommendations have been properly implemented.
 */
describe("DI Tokens Cleanup", () => {
  describe("coreTokens", () => {
    it("should not contain FileTypeMappingsConfig token", () => {
      // Verify that FileTypeMappingsConfig has been removed
      expect(coreTokens).not.toHaveProperty("FileTypeMappingsConfig");
    });

    it("should contain all expected core tokens", () => {
      // Verify that essential tokens are still present
      expect(coreTokens).toHaveProperty("MongoClient");
      expect(coreTokens).toHaveProperty("DatabaseName");
      expect(coreTokens).toHaveProperty("MongoDBConnectionManager");
      expect(coreTokens).toHaveProperty("LLMRouter");
      expect(coreTokens).toHaveProperty("EnvVars");
      expect(coreTokens).toHaveProperty("ProjectName");
      expect(coreTokens).toHaveProperty("DatabaseInitializer");
    });
  });

  describe("llmTokens", () => {
    it("should not contain RetryStrategy token (created via factory pattern)", () => {
      // RetryStrategy is intentionally not in DI container - it's created by llm-factory.ts
      // to keep src/common/llm module framework-agnostic
      expect(llmTokens).not.toHaveProperty("RetryStrategy");
    });

    it("should not contain LLMExecutionPipeline token (created via factory pattern)", () => {
      // LLMExecutionPipeline is intentionally not in DI container - it's created by llm-factory.ts
      // to keep src/common/llm module framework-agnostic
      expect(llmTokens).not.toHaveProperty("LLMExecutionPipeline");
    });

    it("should contain all expected llm tokens", () => {
      // Verify that essential LLM tokens are still present
      expect(llmTokens).toHaveProperty("LLMExecutionStats");
      expect(llmTokens).toHaveProperty("LLMRouter");
      expect(llmTokens).toHaveProperty("LLMErrorLogger");
      // Note: LLMModelFamily was removed in favor of ProviderManager approach
    });
  });

  describe("configTokens", () => {
    it("should contain DatabaseConfig token for injectable database configuration", () => {
      expect(configTokens).toHaveProperty("DatabaseConfig");
      expect(typeof configTokens.DatabaseConfig).toBe("symbol");
    });

    it("should contain FileProcessingRules token for injectable file processing configuration", () => {
      expect(configTokens).toHaveProperty("FileProcessingRules");
      expect(typeof configTokens.FileProcessingRules).toBe("symbol");
    });

    it("should contain all expected config tokens", () => {
      // Verify that all configuration tokens are present
      expect(Object.keys(configTokens)).toEqual(["DatabaseConfig", "FileProcessingRules"]);
    });
  });
});
