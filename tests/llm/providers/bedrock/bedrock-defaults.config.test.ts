import {
  DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS,
  DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS,
  DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS,
  DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS,
} from "../../../../src/llm/providers/bedrock/common/bedrock-defaults.config";

describe("bedrock-defaults.config", () => {
  describe("DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS", () => {
    it("should have a defined timeout value", () => {
      expect(DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS).toBeDefined();
      expect(typeof DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS).toBe("number");
    });

    it("should be set to 8 minutes (480000 milliseconds)", () => {
      expect(DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS).toBe(8 * 60 * 1000);
      expect(DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS).toBe(480000);
    });

    it("should be a positive value", () => {
      expect(DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS).toBeGreaterThan(0);
    });
  });

  describe("DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS", () => {
    it("should have a defined retry attempts value", () => {
      expect(DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS).toBeDefined();
      expect(typeof DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS).toBe("number");
    });

    it("should be set to 4 attempts", () => {
      expect(DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS).toBe(4);
    });

    it("should be a positive value", () => {
      expect(DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS).toBeGreaterThan(0);
    });
  });

  describe("DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS", () => {
    it("should have a defined min retry delay value", () => {
      expect(DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS).toBeDefined();
      expect(typeof DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS).toBe("number");
    });

    it("should be set to 25 seconds (25000 milliseconds)", () => {
      expect(DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS).toBe(25 * 1000);
      expect(DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS).toBe(25000);
    });

    it("should be a positive value", () => {
      expect(DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS).toBeGreaterThan(0);
    });
  });

  describe("DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS", () => {
    it("should have a defined max retry delay value", () => {
      expect(DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS).toBeDefined();
      expect(typeof DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS).toBe("number");
    });

    it("should be set to 240 seconds (240000 milliseconds)", () => {
      expect(DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS).toBe(240 * 1000);
      expect(DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS).toBe(240000);
    });

    it("should be a positive value", () => {
      expect(DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS).toBeGreaterThan(0);
    });

    it("should be greater than min retry delay", () => {
      expect(DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS).toBeGreaterThan(
        DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS,
      );
    });
  });

  describe("configuration consistency", () => {
    it("should have max retry delay greater than min retry delay", () => {
      expect(DEFAULT_BEDROCK_MAX_RETRY_DELAY_MILLIS).toBeGreaterThan(
        DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS,
      );
    });

    it("should have reasonable retry configuration values", () => {
      // Max retry attempts should be reasonable (not too high)
      expect(DEFAULT_BEDROCK_MAX_RETRY_ATTEMPTS).toBeLessThanOrEqual(10);

      // Timeout should be reasonable (less than 15 minutes)
      expect(DEFAULT_BEDROCK_REQUEST_TIMEOUT_MILLIS).toBeLessThanOrEqual(15 * 60 * 1000);

      // Min delay should be at least 1 second
      expect(DEFAULT_BEDROCK_MIN_RETRY_DELAY_MILLIS).toBeGreaterThanOrEqual(1000);
    });
  });
});
