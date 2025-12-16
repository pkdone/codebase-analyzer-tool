import {
  DELIMITERS,
  JSON_KEYWORDS,
  concatenationConfig,
  processingConfig,
  sanitizationConfig,
} from "../../../../../src/common/llm/json-processing/constants/json-processing.config";

describe("json-processing.config", () => {
  describe("DELIMITERS", () => {
    it("should contain all expected delimiter constants", () => {
      expect(DELIMITERS.OPEN_BRACE).toBe("{");
      expect(DELIMITERS.CLOSE_BRACE).toBe("}");
      expect(DELIMITERS.OPEN_BRACKET).toBe("[");
      expect(DELIMITERS.CLOSE_BRACKET).toBe("]");
      expect(DELIMITERS.DOUBLE_QUOTE).toBe('"');
      expect(DELIMITERS.BACKSLASH).toBe("\\");
      expect(DELIMITERS.COMMA).toBe(",");
      expect(DELIMITERS.COLON).toBe(":");
      expect(DELIMITERS.SPACE).toBe(" ");
      expect(DELIMITERS.TAB).toBe("\t");
      expect(DELIMITERS.NEWLINE).toBe("\n");
      expect(DELIMITERS.CARRIAGE_RETURN).toBe("\r");
    });

    it("should be frozen to prevent mutations", () => {
      expect(() => {
        (DELIMITERS as any).OPEN_BRACE = "X";
      }).toThrow();
    });
  });

  describe("JSON_KEYWORDS", () => {
    it("should contain the three JSON keywords", () => {
      expect(JSON_KEYWORDS).toEqual(["true", "false", "null"]);
    });

    it("should be readonly", () => {
      expect(() => {
        (JSON_KEYWORDS as any).push("undefined");
      }).toThrow();
    });
  });

  describe("concatenationConfig", () => {
    it("should contain all expected configuration values", () => {
      expect(concatenationConfig.LIGHT_COLLAPSE_MAX_ITERATIONS).toBe(50);
      expect(concatenationConfig.FULL_NORMALIZE_MAX_ITERATIONS).toBe(80);
      expect(concatenationConfig.LIGHT_COLLAPSE_LITERAL_CHAIN_LIMIT).toBe(6);
      expect(concatenationConfig.FULL_NORMALIZE_LITERAL_CHAIN_LIMIT).toBe(10);
      expect(concatenationConfig.MIXED_CHAIN_LITERAL_LIMIT).toBe(12);
      expect(concatenationConfig.COMPLEX_CHAIN_LITERAL_LIMIT).toBe(20);
    });

    it("should be frozen to prevent mutations", () => {
      expect(() => {
        (concatenationConfig as any).LIGHT_COLLAPSE_MAX_ITERATIONS = 100;
      }).toThrow();
    });
  });

  describe("processingConfig", () => {
    it("should contain all expected configuration values", () => {
      expect(processingConfig.TRUNCATION_SAFETY_BUFFER).toBe(100);
      expect(processingConfig.MAX_RECURSION_DEPTH).toBe(4);
    });

    it("should be frozen to prevent mutations", () => {
      expect(() => {
        (processingConfig as any).TRUNCATION_SAFETY_BUFFER = 200;
      }).toThrow();
    });
  });

  describe("sanitizationConfig", () => {
    it("should combine concatenation and processing configs", () => {
      expect(sanitizationConfig.concatenation).toBe(concatenationConfig);
      expect(sanitizationConfig.processing).toBe(processingConfig);
    });

    it("should be frozen to prevent mutations", () => {
      expect(() => {
        (sanitizationConfig as any).concatenation = {};
      }).toThrow();
    });
  });
});
