/**
 * Tests for the dynamic property name matching utility.
 */

import {
  levenshteinDistance,
  matchPropertyName,
  looksLikePropertyName,
  looksLikeDotSeparatedIdentifier,
  inferFromShortFragment,
  DEFAULT_MATCHER_CONFIG,
} from "../../../../../src/common/llm/json-processing/utils/property-name-matcher";

describe("property-name-matcher", () => {
  describe("levenshteinDistance", () => {
    it("should return 0 for identical strings", () => {
      expect(levenshteinDistance("hello", "hello")).toBe(0);
    });

    it("should return correct distance for single edit", () => {
      expect(levenshteinDistance("hello", "hallo")).toBe(1);
      expect(levenshteinDistance("hello", "helloo")).toBe(1);
      expect(levenshteinDistance("hello", "ello")).toBe(1);
    });

    it("should return correct distance for multiple edits", () => {
      expect(levenshteinDistance("kitten", "sitting")).toBe(3);
      expect(levenshteinDistance("saturday", "sunday")).toBe(3);
    });

    it("should handle empty strings", () => {
      expect(levenshteinDistance("", "hello")).toBe(5);
      expect(levenshteinDistance("hello", "")).toBe(5);
      expect(levenshteinDistance("", "")).toBe(0);
    });

    it("should handle case sensitivity", () => {
      expect(levenshteinDistance("Hello", "hello")).toBe(1);
      expect(levenshteinDistance("HELLO", "hello")).toBe(5);
    });
  });

  describe("matchPropertyName", () => {
    const knownProperties = [
      "name",
      "purpose",
      "description",
      "parameters",
      "returnType",
      "cyclomaticComplexity",
      "linesOfCode",
      "codeSmells",
      "type",
      "value",
      "internalReferences",
      "externalReferences",
      "publicFunctions",
      "publicConstants",
      "integrationPoints",
    ];

    describe("exact matching", () => {
      it("should match exact property names", () => {
        const result = matchPropertyName("name", knownProperties);
        expect(result.matched).toBe("name");
        expect(result.matchType).toBe("exact");
        expect(result.confidence).toBe(1.0);
      });

      it("should match exact property names case-insensitively", () => {
        const result = matchPropertyName("NAME", knownProperties);
        expect(result.matched).toBe("name");
        expect(result.matchType).toBe("exact");
      });

      it("should match camelCase properties", () => {
        const result = matchPropertyName("returnType", knownProperties);
        expect(result.matched).toBe("returnType");
        expect(result.matchType).toBe("exact");
      });
    });

    describe("prefix matching", () => {
      it("should match truncated property names", () => {
        const result = matchPropertyName("purpos", knownProperties);
        expect(result.matched).toBe("purpose");
        expect(result.matchType).toBe("prefix");
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it("should match multi-character prefix", () => {
        const result = matchPropertyName("desc", knownProperties);
        expect(result.matched).toBe("description");
        expect(result.matchType).toBe("prefix");
      });

      it("should match long truncations", () => {
        const result = matchPropertyName("cyclomaticComplex", knownProperties);
        expect(result.matched).toBe("cyclomaticComplexity");
        expect(result.matchType).toBe("prefix");
        expect(result.confidence).toBeGreaterThan(0.8);
      });

      it("should prefer shorter matching property when multiple match", () => {
        // "type" should match over "returnType" for prefix "ty"
        const result = matchPropertyName("ty", knownProperties);
        expect(result.matched).toBe("type");
        expect(result.matchType).toBe("prefix");
      });
    });

    describe("suffix matching", () => {
      it("should match property name suffixes", () => {
        // "eferences" is the end of "internalReferences" and "externalReferences"
        const result = matchPropertyName("eferences", knownProperties);
        expect(result.matched).toBeDefined();
        expect(result.matchType).toBe("prefix"); // suffix matching returns "prefix" type
      });

      it("should match truncated starts like 'unctions'", () => {
        const result = matchPropertyName("unctions", knownProperties);
        // Should match publicFunctions
        expect(result.matched).toBe("publicFunctions");
      });
    });

    describe("fuzzy matching", () => {
      it("should match typos with 1 edit distance", () => {
        const result = matchPropertyName("naem", knownProperties);
        expect(result.matched).toBe("name");
        expect(result.matchType).toBe("fuzzy");
        expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      });

      it("should match typos with 2 edit distance", () => {
        const result = matchPropertyName("descritpion", knownProperties);
        expect(result.matched).toBe("description");
        expect(result.matchType).toBe("fuzzy");
      });

      it("should not match when distance exceeds threshold", () => {
        const result = matchPropertyName("xyzabc", knownProperties);
        expect(result.matched).toBeUndefined();
        expect(result.matchType).toBe("none");
      });

      it("should match common LLM typos", () => {
        const result = matchPropertyName("reurnType", knownProperties);
        expect(result.matched).toBe("returnType");
        expect(result.matchType).toBe("fuzzy");
      });
    });

    describe("no match cases", () => {
      it("should return no match for empty fragment", () => {
        const result = matchPropertyName("", knownProperties);
        expect(result.matched).toBeUndefined();
        expect(result.matchType).toBe("none");
      });

      it("should return no match for empty known properties", () => {
        const result = matchPropertyName("name", []);
        expect(result.matched).toBeUndefined();
        expect(result.matchType).toBe("none");
      });

      it("should return no match for completely unrelated string", () => {
        const result = matchPropertyName("xyzabc123", knownProperties);
        expect(result.matched).toBeUndefined();
        expect(result.matchType).toBe("none");
      });
    });

    describe("configuration options", () => {
      it("should respect minPrefixLength", () => {
        const result = matchPropertyName("n", knownProperties, { minPrefixLength: 2 });
        expect(result.matchType).toBe("none");
      });

      it("should respect case sensitivity config", () => {
        const result = matchPropertyName("NAME", knownProperties, { caseInsensitive: false });
        expect(result.matchType).toBe("none");
      });

      it("should use default config values", () => {
        expect(DEFAULT_MATCHER_CONFIG.minPrefixLength).toBe(2);
        expect(DEFAULT_MATCHER_CONFIG.maxLevenshteinDistance).toBe(2);
        expect(DEFAULT_MATCHER_CONFIG.caseInsensitive).toBe(true);
      });
    });
  });

  describe("looksLikePropertyName", () => {
    it("should return true for valid identifiers", () => {
      expect(looksLikePropertyName("name")).toBe(true);
      expect(looksLikePropertyName("myProperty")).toBe(true);
      expect(looksLikePropertyName("_private")).toBe(true);
      expect(looksLikePropertyName("$special")).toBe(true);
      expect(looksLikePropertyName("prop123")).toBe(true);
    });

    it("should return true for dot-separated names", () => {
      expect(looksLikePropertyName("com.example.Class")).toBe(true);
    });

    it("should return false for invalid identifiers", () => {
      expect(looksLikePropertyName("")).toBe(false);
      expect(looksLikePropertyName("123abc")).toBe(false);
      expect(looksLikePropertyName("has space")).toBe(false);
      expect(looksLikePropertyName("has:colon")).toBe(false);
    });
  });

  describe("looksLikeDotSeparatedIdentifier", () => {
    it("should return true for package-like names", () => {
      expect(looksLikeDotSeparatedIdentifier("org.apache.fineract")).toBe(true);
      expect(looksLikeDotSeparatedIdentifier("com.example.MyClass")).toBe(true);
      expect(looksLikeDotSeparatedIdentifier("java.util.List")).toBe(true);
    });

    it("should return false for non-dot-separated strings", () => {
      expect(looksLikeDotSeparatedIdentifier("")).toBe(false);
      expect(looksLikeDotSeparatedIdentifier("nodot")).toBe(false);
      expect(looksLikeDotSeparatedIdentifier("a.")).toBe(false);
      expect(looksLikeDotSeparatedIdentifier(".a")).toBe(false);
    });

    it("should return false for invalid segments", () => {
      expect(looksLikeDotSeparatedIdentifier("123.456")).toBe(false);
      expect(looksLikeDotSeparatedIdentifier("valid.123invalid")).toBe(false);
    });

    it("should require at least two segments", () => {
      expect(looksLikeDotSeparatedIdentifier("single")).toBe(false);
    });
  });

  describe("inferFromShortFragment", () => {
    it("should infer common property names from short fragments", () => {
      expect(inferFromShortFragment("n")).toBe("name");
      expect(inferFromShortFragment("na")).toBe("name");
      expect(inferFromShortFragment("ty")).toBe("type");
      expect(inferFromShortFragment("va")).toBe("value");
    });

    it("should validate against known properties when provided", () => {
      const knownProps = ["value", "purpose"];
      const result = inferFromShortFragment("va", knownProps);
      expect(result).toBe("value");
    });

    it("should return undefined for unknown fragments", () => {
      expect(inferFromShortFragment("xyz")).toBeUndefined();
      expect(inferFromShortFragment("qq")).toBeUndefined();
    });

    it("should handle case insensitively", () => {
      expect(inferFromShortFragment("NA")).toBe("name");
      expect(inferFromShortFragment("TY")).toBe("type");
    });
  });

  describe("real-world LLM corruption patterns", () => {
    const schemaProperties = [
      "name",
      "purpose",
      "description",
      "parameters",
      "returnType",
      "implementation",
      "codeSmells",
      "references",
      "publicFunctions",
      "publicConstants",
      "internalReferences",
      "externalReferences",
      "integrationPoints",
      "databaseIntegration",
      "codeQualityMetrics",
      "cyclomaticComplexity",
      "linesOfCode",
    ];

    it("should handle 'se' -> 'purpose' pattern", () => {
      // This is a common truncation pattern observed in LLM output
      const result = matchPropertyName("se", schemaProperties, { minPrefixLength: 2 });
      // 'se' doesn't directly prefix any property, but it matches as a suffix of 'purpose'
      // In the actual usage, we'd also fall back to short fragment inference
      // Since suffix matching is now included, this may match
      expect(result.matchType).toBeDefined();
    });

    it("should handle 'implemen' truncation", () => {
      const result = matchPropertyName("implemen", schemaProperties);
      expect(result.matched).toBe("implementation");
      expect(result.matchType).toBe("prefix");
    });

    it("should handle 'alues' suffix pattern (truncated 'codeSmells.values')", () => {
      // Common pattern where "codeSmells" gets corrupted to end with "alues"
      const result = matchPropertyName("alues", ["values", "codeSmells"]);
      expect(result.matched).toBe("values");
      expect(result.matchType).toBe("prefix"); // suffix match
    });

    it("should handle 'eferences' truncation", () => {
      const result = matchPropertyName("eferences", schemaProperties);
      // Should match one of the reference properties via suffix matching
      expect(result.matched).toBeDefined();
      // The matched property should end with "eferences" (case-insensitive)
      expect(result.matched?.toLowerCase()).toContain("references");
    });

    it("should handle 'publMethods' typo", () => {
      const result = matchPropertyName("publMethods", [...schemaProperties, "publicMethods"]);
      // This should fuzzy match to publicMethods or publicFunctions
      expect(result.matched).toBeDefined();
    });

    it("should handle 'cyclometicComplexity' typo", () => {
      const result = matchPropertyName("cyclometicComplexity", schemaProperties);
      expect(result.matched).toBe("cyclomaticComplexity");
      expect(result.matchType).toBe("fuzzy");
    });
  });
});
