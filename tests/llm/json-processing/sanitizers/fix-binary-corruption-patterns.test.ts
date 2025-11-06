import { fixBinaryCorruptionPatterns } from "../../../../src/llm/json-processing/sanitizers/fix-binary-corruption-patterns";
import { SANITIZATION_STEP } from "../../../../src/llm/json-processing/config/sanitization-steps.config";

describe("fixBinaryCorruptionPatterns", () => {
  describe("binary corruption markers", () => {
    it("should remove <y_bin_XXX> markers", () => {
      const input = `      "cyclomaticComplexity": 1,
      <y_bin_305>OfCode": 1,
      "codeSmells": []`;

      const result = fixBinaryCorruptionPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.description).toBe(SANITIZATION_STEP.FIXED_BINARY_CORRUPTION_PATTERNS);
      // The sanitizer now just removes the marker - property name fixing is handled by fixPropertyNames
      expect(result.content).toContain('OfCode": 1');
      expect(result.content).not.toContain("<y_bin_");
      expect(result.diagnostics).toBeDefined();
      expect(result.diagnostics?.length).toBeGreaterThan(0);
    });

    it("should handle the exact error case from InteropService log", () => {
      const input = `      "cyclomaticComplexity": 1,
      <y_bin_305>OfCode": 1,
      "codeSmells": []
    },
    {
      "name": "createTransactionRequest"`;

      const result = fixBinaryCorruptionPatterns(input);

      expect(result.changed).toBe(true);
      // The sanitizer removes the marker - property name will be fixed by fixPropertyNames later
      expect(result.content).toContain('OfCode": 1');
      expect(result.content).not.toContain("<y_bin_");
    });

    it("should remove general binary corruption markers", () => {
      const input = `      "name": "test",
      <y_bin_123>something": "value"`;

      const result = fixBinaryCorruptionPatterns(input);

      expect(result.changed).toBe(true);
      expect(result.content).not.toContain("<y_bin_");
      expect(result.content).toContain('something": "value"');
      expect(result.diagnostics).toBeDefined();
    });

    it("should not modify binary markers inside string values", () => {
      const input = `      "description": "This contains <y_bin_305>OfCode marker in text"`;

      const result = fixBinaryCorruptionPatterns(input);

      // Should not change because it's inside a string
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("stray text before opening braces", () => {
    it("should not handle stray text before braces (moved to removeInvalidPrefixes)", () => {
      const input = `  "publicMethods": [
    {
      "name": "test"
    },
    so{
      "name": "getKyc"
    }
  ]`;

      const result = fixBinaryCorruptionPatterns(input);

      // This functionality was moved to removeInvalidPrefixes sanitizer
      // This sanitizer now only handles binary markers
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });

  describe("combined scenarios", () => {
    it("should fix binary corruption markers only", () => {
      const input = `  "publicMethods": [
    {
      "cyclomaticComplexity": 1,
      <y_bin_305>OfCode": 1,
      "codeSmells": []
    },
    so{
      "name": "getKyc"
    }
  ]`;

      const result = fixBinaryCorruptionPatterns(input);

      expect(result.changed).toBe(true);
      // Only removes binary markers - property name fixing happens later in pipeline
      expect(result.content).toContain('OfCode": 1');
      expect(result.content).not.toContain("<y_bin_");
      // Stray text before braces is handled by removeInvalidPrefixes, not this sanitizer
      expect(result.content).toContain("so{");
    });

    it("should handle the full error case from the log file", () => {
      // This is a simplified version of the actual error
      const input = `      "cyclomaticComplexity": 1,
      <y_bin_305>OfCode": 1,
      "codeSmells": []
    },
    {
      "name": "createTransactionRequest",
      "purpose": "Initiates a new interoperability transaction",
      "cyclomaticComplexity": 1,
      "linesOfCode": 1,
      "codeSmells": []
    },
    so{
      "name": "getKyc",
      "purpose": "Retrieves Know Your Customer"`;

      const result = fixBinaryCorruptionPatterns(input);

      expect(result.changed).toBe(true);
      // Removes binary marker - property name will be fixed by fixPropertyNames
      expect(result.content).toContain('OfCode": 1');
      expect(result.content).not.toContain("<y_bin_");
      // Stray text before braces is handled by removeInvalidPrefixes
      expect(result.content).toContain("so{");
    });
  });

  describe("edge cases", () => {
    it("should not modify valid JSON", () => {
      const input = `    {
      "name": "test",
      "linesOfCode": 1
    }`;

      const result = fixBinaryCorruptionPatterns(input);

      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });

    it("should handle different binary marker numbers", () => {
      const input = `      <y_bin_999>OfCode": 1`;

      const result = fixBinaryCorruptionPatterns(input);

      expect(result.changed).toBe(true);
      // Just removes the marker - property name fixing happens later
      expect(result.content).toContain('OfCode": 1');
      expect(result.content).not.toContain("<y_bin_");
    });

    it("should not handle stray text before braces (moved to removeInvalidPrefixes)", () => {
      const input = `  "publicMethods": [
    {
      "name": "test1"
    },
    abc{
      "name": "test2"
    }
  ]`;

      const result = fixBinaryCorruptionPatterns(input);

      // This functionality was moved to removeInvalidPrefixes sanitizer
      expect(result.changed).toBe(false);
      expect(result.content).toBe(input);
    });
  });
});
