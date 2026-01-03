import {
  processingConfig,
  sanitizationConfig,
  JSON_KEYWORDS,
  JSON_KEYWORDS_SET,
  parsingHeuristics,
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

  describe("parsingHeuristics", () => {
    it("should have CONTEXT_LOOKBACK_LENGTH defined", () => {
      expect(parsingHeuristics.CONTEXT_LOOKBACK_LENGTH).toBeDefined();
      expect(typeof parsingHeuristics.CONTEXT_LOOKBACK_LENGTH).toBe("number");
      expect(parsingHeuristics.CONTEXT_LOOKBACK_LENGTH).toBe(500);
      expect(parsingHeuristics.CONTEXT_LOOKBACK_LENGTH).toBeGreaterThan(0);
    });

    it("should have START_OF_FILE_OFFSET_LIMIT defined", () => {
      expect(parsingHeuristics.START_OF_FILE_OFFSET_LIMIT).toBeDefined();
      expect(typeof parsingHeuristics.START_OF_FILE_OFFSET_LIMIT).toBe("number");
      expect(parsingHeuristics.START_OF_FILE_OFFSET_LIMIT).toBe(100);
      expect(parsingHeuristics.START_OF_FILE_OFFSET_LIMIT).toBeGreaterThan(0);
    });

    it("should have PROPERTY_CONTEXT_OFFSET_LIMIT defined", () => {
      expect(parsingHeuristics.PROPERTY_CONTEXT_OFFSET_LIMIT).toBeDefined();
      expect(typeof parsingHeuristics.PROPERTY_CONTEXT_OFFSET_LIMIT).toBe("number");
      expect(parsingHeuristics.PROPERTY_CONTEXT_OFFSET_LIMIT).toBe(200);
      expect(parsingHeuristics.PROPERTY_CONTEXT_OFFSET_LIMIT).toBeGreaterThan(0);
    });

    it("should have parsingHeuristics as a frozen object", () => {
      expect(Object.isFrozen(parsingHeuristics)).toBe(true);
    });

    it("should have CONTEXT_LOOKBACK_LENGTH greater than PROPERTY_CONTEXT_OFFSET_LIMIT", () => {
      expect(parsingHeuristics.CONTEXT_LOOKBACK_LENGTH).toBeGreaterThan(
        parsingHeuristics.PROPERTY_CONTEXT_OFFSET_LIMIT,
      );
    });

    it("should have PROPERTY_CONTEXT_OFFSET_LIMIT greater than START_OF_FILE_OFFSET_LIMIT", () => {
      expect(parsingHeuristics.PROPERTY_CONTEXT_OFFSET_LIMIT).toBeGreaterThan(
        parsingHeuristics.START_OF_FILE_OFFSET_LIMIT,
      );
    });
  });

  describe("sanitizationConfig", () => {
    it("should include processingConfig in sanitizationConfig.processing", () => {
      expect(sanitizationConfig.processing).toBeDefined();
      expect(sanitizationConfig.processing.MAX_DIAGNOSTICS_PER_STRATEGY).toBe(
        processingConfig.MAX_DIAGNOSTICS_PER_STRATEGY,
      );
    });

    it("should include parsingHeuristics in sanitizationConfig.parsing", () => {
      expect(sanitizationConfig.parsing).toBeDefined();
      expect(sanitizationConfig.parsing.CONTEXT_LOOKBACK_LENGTH).toBe(
        parsingHeuristics.CONTEXT_LOOKBACK_LENGTH,
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

  describe("JSON_KEYWORDS", () => {
    it("should contain true, false, and null", () => {
      expect(JSON_KEYWORDS).toContain("true");
      expect(JSON_KEYWORDS).toContain("false");
      expect(JSON_KEYWORDS).toContain("null");
    });

    it("should be a frozen array", () => {
      expect(Object.isFrozen(JSON_KEYWORDS)).toBe(true);
    });
  });

  describe("JSON_KEYWORDS_SET", () => {
    it("should contain all JSON keywords plus undefined", () => {
      expect(JSON_KEYWORDS_SET.has("true")).toBe(true);
      expect(JSON_KEYWORDS_SET.has("false")).toBe(true);
      expect(JSON_KEYWORDS_SET.has("null")).toBe(true);
      expect(JSON_KEYWORDS_SET.has("undefined")).toBe(true);
    });

    it("should NOT contain common English words", () => {
      // These were in the old EXCLUDED_STRAY_WORDS but should not be in JSON_KEYWORDS_SET
      expect(JSON_KEYWORDS_SET.has("the")).toBe(false);
      expect(JSON_KEYWORDS_SET.has("and")).toBe(false);
      expect(JSON_KEYWORDS_SET.has("or")).toBe(false);
      expect(JSON_KEYWORDS_SET.has("but")).toBe(false);
    });

    it("should be a frozen Set", () => {
      expect(Object.isFrozen(JSON_KEYWORDS_SET)).toBe(true);
    });

    it("should provide O(1) lookup performance for keyword checking", () => {
      // This test verifies the Set can be used efficiently in hot paths
      const iterations = 10000;
      const start = performance.now();
      for (let i = 0; i < iterations; i++) {
        JSON_KEYWORDS_SET.has("true");
        JSON_KEYWORDS_SET.has("notakeyword");
      }
      const elapsed = performance.now() - start;
      // Should complete in well under 100ms
      expect(elapsed).toBeLessThan(100);
    });
  });
});
