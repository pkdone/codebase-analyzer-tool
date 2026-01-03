import { defaultBedrockProviderConfig } from "../../../../../src/common/llm/providers/bedrock/common/bedrock-defaults.config";

describe("bedrock-defaults.config", () => {
  describe("defaultBedrockProviderConfig", () => {
    it("should have all required configuration properties", () => {
      expect(defaultBedrockProviderConfig).toBeDefined();
      expect(defaultBedrockProviderConfig.requestTimeoutMillis).toBeDefined();
      expect(defaultBedrockProviderConfig.maxRetryAttempts).toBeDefined();
      expect(defaultBedrockProviderConfig.minRetryDelayMillis).toBeDefined();
      expect(defaultBedrockProviderConfig.maxRetryDelayMillis).toBeDefined();
    });

    it("should have correct request timeout value (8 minutes)", () => {
      expect(defaultBedrockProviderConfig.requestTimeoutMillis).toBe(8 * 60 * 1000);
      expect(defaultBedrockProviderConfig.requestTimeoutMillis).toBe(480000);
    });

    it("should have correct max retry attempts value", () => {
      expect(defaultBedrockProviderConfig.maxRetryAttempts).toBe(4);
    });

    it("should have correct min retry delay value (25 seconds)", () => {
      expect(defaultBedrockProviderConfig.minRetryDelayMillis).toBe(25 * 1000);
      expect(defaultBedrockProviderConfig.minRetryDelayMillis).toBe(25000);
    });

    it("should have correct max retry delay value (240 seconds)", () => {
      expect(defaultBedrockProviderConfig.maxRetryDelayMillis).toBe(240 * 1000);
      expect(defaultBedrockProviderConfig.maxRetryDelayMillis).toBe(240000);
    });

    it("should have all positive values", () => {
      expect(defaultBedrockProviderConfig.requestTimeoutMillis).toBeGreaterThan(0);
      expect(defaultBedrockProviderConfig.maxRetryAttempts).toBeGreaterThan(0);
      expect(defaultBedrockProviderConfig.minRetryDelayMillis).toBeGreaterThan(0);
      expect(defaultBedrockProviderConfig.maxRetryDelayMillis).toBeGreaterThan(0);
    });

    it("should have max retry delay greater than min retry delay", () => {
      expect(defaultBedrockProviderConfig.maxRetryDelayMillis).toBeGreaterThan(
        defaultBedrockProviderConfig.minRetryDelayMillis,
      );
    });

    it("should have reasonable retry configuration values", () => {
      // Max retry attempts should be reasonable (not too high)
      expect(defaultBedrockProviderConfig.maxRetryAttempts).toBeLessThanOrEqual(10);

      // Timeout should be reasonable (less than 15 minutes)
      expect(defaultBedrockProviderConfig.requestTimeoutMillis).toBeLessThanOrEqual(15 * 60 * 1000);

      // Min delay should be at least 1 second
      expect(defaultBedrockProviderConfig.minRetryDelayMillis).toBeGreaterThanOrEqual(1000);
    });
  });
});
