import { defaultOpenAIProviderConfig } from "../../../../../src/common/llm/providers/openai/common/openai-defaults.config";

describe("openai-defaults.config", () => {
  describe("defaultOpenAIProviderConfig", () => {
    it("should have a defined request timeout value", () => {
      expect(defaultOpenAIProviderConfig.requestTimeoutMillis).toBeDefined();
      expect(typeof defaultOpenAIProviderConfig.requestTimeoutMillis).toBe("number");
    });

    it("should be set to 5 minutes (300000 milliseconds)", () => {
      expect(defaultOpenAIProviderConfig.requestTimeoutMillis).toBe(5 * 60 * 1000);
      expect(defaultOpenAIProviderConfig.requestTimeoutMillis).toBe(300000);
    });

    it("should have a defined max retry attempts value", () => {
      expect(defaultOpenAIProviderConfig.maxRetryAttempts).toBeDefined();
      expect(typeof defaultOpenAIProviderConfig.maxRetryAttempts).toBe("number");
    });

    it("should be set to 3 attempts", () => {
      expect(defaultOpenAIProviderConfig.maxRetryAttempts).toBe(3);
    });

    it("should have a defined min retry delay value", () => {
      expect(defaultOpenAIProviderConfig.minRetryDelayMillis).toBeDefined();
      expect(typeof defaultOpenAIProviderConfig.minRetryDelayMillis).toBe("number");
    });

    it("should have min retry delay set to 10 seconds (10000 milliseconds)", () => {
      expect(defaultOpenAIProviderConfig.minRetryDelayMillis).toBe(10 * 1000);
      expect(defaultOpenAIProviderConfig.minRetryDelayMillis).toBe(10000);
    });

    it("should have a defined max retry delay value", () => {
      expect(defaultOpenAIProviderConfig.maxRetryDelayMillis).toBeDefined();
      expect(typeof defaultOpenAIProviderConfig.maxRetryDelayMillis).toBe("number");
    });

    it("should have max retry delay set to 90 seconds (90000 milliseconds)", () => {
      expect(defaultOpenAIProviderConfig.maxRetryDelayMillis).toBe(90 * 1000);
      expect(defaultOpenAIProviderConfig.maxRetryDelayMillis).toBe(90000);
    });

    it("should have max retry delay greater than min retry delay", () => {
      expect(defaultOpenAIProviderConfig.maxRetryDelayMillis).toBeGreaterThan(
        defaultOpenAIProviderConfig.minRetryDelayMillis,
      );
    });

    it("should have reasonable configuration values", () => {
      // Max retry attempts should be reasonable (not too high)
      expect(defaultOpenAIProviderConfig.maxRetryAttempts).toBeLessThanOrEqual(10);

      // Timeout should be reasonable (less than 15 minutes)
      expect(defaultOpenAIProviderConfig.requestTimeoutMillis).toBeLessThanOrEqual(15 * 60 * 1000);

      // Min delay should be at least 1 second
      expect(defaultOpenAIProviderConfig.minRetryDelayMillis).toBeGreaterThanOrEqual(1000);
    });

    it("should have all required retry configuration properties", () => {
      // Verify all expected properties exist
      expect(defaultOpenAIProviderConfig).toHaveProperty("requestTimeoutMillis");
      expect(defaultOpenAIProviderConfig).toHaveProperty("maxRetryAttempts");
      expect(defaultOpenAIProviderConfig).toHaveProperty("minRetryDelayMillis");
      expect(defaultOpenAIProviderConfig).toHaveProperty("maxRetryDelayMillis");
    });
  });
});
