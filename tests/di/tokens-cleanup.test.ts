import { coreTokens } from "../../src/di/tokens";

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
});
