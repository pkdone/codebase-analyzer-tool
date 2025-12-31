import {
  processingConfig,
  sanitizationConfig,
} from "../../../../../src/common/llm/json-processing/constants/json-processing.config";

describe("JSON Processing Configuration", () => {
  describe("processingConfig", () => {
    it("should have TRUNCATION_SAFETY_BUFFER defined", () => {
      expect(processingConfig.TRUNCATION_SAFETY_BUFFER).toBeDefined();
      expect(typeof processingConfig.TRUNCATION_SAFETY_BUFFER).toBe("number");
      expect(processingConfig.TRUNCATION_SAFETY_BUFFER).toBeGreaterThan(0);
    });

    it("should have MAX_RECURSION_DEPTH defined", () => {
      expect(processingConfig.MAX_RECURSION_DEPTH).toBeDefined();
      expect(typeof processingConfig.MAX_RECURSION_DEPTH).toBe("number");
      expect(processingConfig.MAX_RECURSION_DEPTH).toBeGreaterThan(0);
    });

    it("should have MAX_DIAGNOSTICS_PER_STRATEGY defined", () => {
      expect(processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY).toBeDefined();
      expect(typeof processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY).toBe("number");
      expect(processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY).toBeGreaterThan(0);
    });

    it("should have MAX_DIAGNOSTICS_PER_STRATEGY set to 20", () => {
      expect(processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY).toBe(20);
    });
  });

  describe("sanitizationConfig", () => {
    it("should include processingConfig in sanitizationConfig.processing", () => {
      expect(sanitizationConfig.processing).toBeDefined();
      expect(sanitizationConfig.processing.MAX_DIAGNOSTICS_PER_STRATEGY).toBe(
        processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY,
      );
    });
  });

  describe("config immutability", () => {
    it("should have processingConfig as a frozen object", () => {
      expect(Object.isFrozen(processingConfig)).toBe(true);
    });

    it("should have sanitizationConfig as a frozen object", () => {
      expect(Object.isFrozen(sanitizationConfig)).toBe(true);
    });
  });
});

