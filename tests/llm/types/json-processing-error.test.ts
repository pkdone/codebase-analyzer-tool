import { JsonProcessingError } from "../../../src/llm/types/llm-errors.types";

/**
 * Tests for the JsonProcessingError class to ensure it correctly captures
 * debugging context for JSON processing failures.
 */
describe("JsonProcessingError", () => {
  describe("constructor", () => {
    it("creates error with all required properties", () => {
      const originalContent = '{ "key": "malformed value }';
      const sanitizedContent = '{ "key": "malformed value" }';
      const appliedSanitizers = ["removeCodeFences", "fixOverEscapedSequences"];
      const underlyingError = new Error("Unexpected end of JSON input");

      const error = new JsonProcessingError(
        "Failed to parse JSON",
        originalContent,
        sanitizedContent,
        appliedSanitizers,
        underlyingError,
      );

      expect(error.name).toBe("JsonProcessingError");
      expect(error.message).toContain("Failed to parse JSON");
      expect(error.originalContent).toBe(originalContent);
      expect(error.sanitizedContent).toBe(sanitizedContent);
      expect(error.appliedSanitizers).toEqual(appliedSanitizers);
      expect(error.underlyingError).toBe(underlyingError);
    });

    it("creates error without underlying error", () => {
      const error = new JsonProcessingError("Validation failed", "original", "sanitized", [
        "sanitizer1",
      ]);

      expect(error.underlyingError).toBeUndefined();
    });

    it("includes context information in error message", () => {
      const error = new JsonProcessingError(
        "Processing failed",
        "original content",
        "sanitized content",
        ["step1", "step2"],
        new Error("Parse error"),
      );

      expect(error.message).toContain("Processing failed");
      expect(error.message).toContain("originalLength");
      expect(error.message).toContain("sanitizedLength");
      expect(error.message).toContain("appliedSanitizers");
      expect(error.message).toContain("Parse error");
    });
  });

  describe("readonly properties", () => {
    it("has originalContent property with correct value", () => {
      const error = new JsonProcessingError("Error", "original", "sanitized", []);

      expect(error.originalContent).toBe("original");
    });

    it("has sanitizedContent property with correct value", () => {
      const error = new JsonProcessingError("Error", "original", "sanitized", []);

      expect(error.sanitizedContent).toBe("sanitized");
    });

    it("has appliedSanitizers property with correct value", () => {
      const sanitizers = ["step1", "step2"];
      const error = new JsonProcessingError("Error", "original", "sanitized", sanitizers);

      expect(error.appliedSanitizers).toEqual(sanitizers);
      // Verify it's an array and has the correct length
      expect(Array.isArray(error.appliedSanitizers)).toBe(true);
      expect(error.appliedSanitizers.length).toBe(2);
    });
  });

  describe("debugging context", () => {
    it("captures original and sanitized content lengths in message", () => {
      const originalContent = "a".repeat(1000);
      const sanitizedContent = "b".repeat(500);
      const error = new JsonProcessingError(
        "Length mismatch",
        originalContent,
        sanitizedContent,
        [],
      );

      expect(error.message).toContain('"originalLength":1000');
      expect(error.message).toContain('"sanitizedLength":500');
    });

    it("captures applied sanitizers list in message", () => {
      const sanitizers = ["trimWhitespace", "removeCodeFences", "fixOverEscapedSequences"];
      const error = new JsonProcessingError("Multiple sanitizers", "orig", "san", sanitizers);

      expect(error.message).toContain('"appliedSanitizers"');
      expect(error.message).toContain("trimWhitespace");
      expect(error.message).toContain("removeCodeFences");
      expect(error.message).toContain("fixOverEscapedSequences");
    });

    it("captures underlying error message in context", () => {
      const underlyingError = new Error("SyntaxError: Unexpected token");
      const error = new JsonProcessingError(
        "Parse failed",
        "original",
        "sanitized",
        [],
        underlyingError,
      );

      expect(error.message).toContain("SyntaxError: Unexpected token");
      expect(error.message).toContain('"underlyingError"');
    });

    it("handles empty sanitizers list", () => {
      const error = new JsonProcessingError("No sanitizers applied", "orig", "san", []);

      expect(error.message).toContain('"appliedSanitizers":[]');
      expect(error.appliedSanitizers).toHaveLength(0);
    });
  });

  describe("inheritance", () => {
    it("is instance of Error", () => {
      const error = new JsonProcessingError("Error", "orig", "san", []);

      expect(error).toBeInstanceOf(Error);
    });

    it("has correct prototype chain", () => {
      const error = new JsonProcessingError("Error", "orig", "san", []);

      expect(Object.getPrototypeOf(error).constructor.name).toBe("JsonProcessingError");
    });
  });

  describe("real-world scenarios", () => {
    it("captures context for over-escaped JSON", () => {
      // Using a more reasonable example of over-escaped content
      // Original has 5-backslash quotes, sanitized normalizes them
      const originalContent = String.raw`{ "sql": "it\\\\'s working" }`;
      const sanitizedContent = '{ "sql": "it\'s working" }';
      const appliedSanitizers = ["fixOverEscapedSequences"];

      const error = new JsonProcessingError(
        "Over-escaped sequences detected",
        originalContent,
        sanitizedContent,
        appliedSanitizers,
      );

      expect(error.appliedSanitizers).toContain("fixOverEscapedSequences");
      expect(error.originalContent.length).toBeGreaterThan(error.sanitizedContent.length);
    });

    it("captures context for truncated JSON", () => {
      const originalContent = '{ "data": [ { "id": 1 }, { "id": 2 }';
      const sanitizedContent = '{ "data": [ { "id": 1 }, { "id": 2 } ] }';
      const appliedSanitizers = ["completeTruncatedStructures"];

      const error = new JsonProcessingError(
        "Truncated JSON completed",
        originalContent,
        sanitizedContent,
        appliedSanitizers,
        new Error("Unexpected end of JSON input"),
      );

      expect(error.appliedSanitizers).toContain("completeTruncatedStructures");
      expect(error.underlyingError?.message).toBe("Unexpected end of JSON input");
    });

    it("captures context for multiple sanitization steps", () => {
      const originalContent = '```json\n{ "key":\n "value" }\n```';
      const sanitizedContent = '{ "key": "value" }';
      const appliedSanitizers = [
        "removeCodeFences",
        "trimWhitespace",
        "removeControlChars",
        "addMissingPropertyCommas",
      ];

      const error = new JsonProcessingError(
        "Multiple sanitization steps applied",
        originalContent,
        sanitizedContent,
        appliedSanitizers,
      );

      expect(error.appliedSanitizers).toHaveLength(4);
      expect(error.message).toContain("Multiple sanitization steps applied");
    });

    it("provides useful debugging information for validation failures", () => {
      const originalContent = '{ "requiredField": null }';
      const sanitizedContent = '{ "requiredField": null }';
      const appliedSanitizers: string[] = [];

      const error = new JsonProcessingError(
        "Schema validation failed: requiredField must be a string",
        originalContent,
        sanitizedContent,
        appliedSanitizers,
        new Error("Invalid type: expected string"),
      );

      // No sanitizers applied, so content unchanged
      expect(error.originalContent).toBe(error.sanitizedContent);
      expect(error.appliedSanitizers).toHaveLength(0);
      expect(error.message).toContain("Schema validation failed");
      expect(error.underlyingError?.message).toBe("Invalid type: expected string");
    });
  });
});
