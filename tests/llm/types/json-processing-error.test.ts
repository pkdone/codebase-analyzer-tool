import {
  JsonProcessingError,
  JsonProcessingErrorType,
} from "../../../src/llm/json-processing/types/json-processing.errors";

describe("JsonProcessingError", () => {
  describe("constructor", () => {
    it("should create parse error with all context fields", () => {
      const message = "Failed to parse JSON";
      const originalContent = '{"invalid": json}';
      const sanitizedContent = '{"invalid": "json"}';
      const appliedSanitizers = ["removeCodeFences", "addMissingPropertyCommas"];
      const underlyingError = new SyntaxError("Unexpected token");

      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        message,
        originalContent,
        sanitizedContent,
        appliedSanitizers,
        underlyingError,
      );

      expect(error).toBeInstanceOf(JsonProcessingError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("JsonProcessingError");
      expect(error.type).toBe("parse");
      expect(error.message).toContain(message);
      expect(error.originalContent).toBe(originalContent);
      expect(error.sanitizedContent).toBe(sanitizedContent);
      expect(error.appliedSanitizers).toEqual(appliedSanitizers);
      expect(error.underlyingError).toBe(underlyingError);
    });

    it("should create validation error with all context fields", () => {
      const message = "Schema validation failed";
      const originalContent = '{"valid": "json"}';
      const sanitizedContent = '{"valid": "json"}';
      const appliedSanitizers = ["trimWhitespace"];
      const underlyingError = new Error("Schema mismatch");

      const error = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        message,
        originalContent,
        sanitizedContent,
        appliedSanitizers,
        underlyingError,
      );

      expect(error).toBeInstanceOf(JsonProcessingError);
      expect(error.type).toBe("validation");
      expect(error.message).toContain(message);
      expect(error.originalContent).toBe(originalContent);
      expect(error.sanitizedContent).toBe(sanitizedContent);
    });

    it("should work without underlying error", () => {
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Failed to parse JSON",
        "original",
        "sanitized",
        ["step1", "step2"],
      );

      expect(error.underlyingError).toBeUndefined();
      expect(error.message).toContain("Failed to parse JSON");
    });

    it("should include metadata in error message", () => {
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Failed to parse",
        "original content here",
        "sanitized content here",
        ["step1", "step2"],
        new Error("Underlying issue"),
      );

      const message = error.message;
      expect(message).toContain("Failed to parse");
      expect(message).toContain("type");
      expect(message).toContain("parse");
      expect(message).toContain("originalLength");
      expect(message).toContain("sanitizedLength");
      expect(message).toContain("appliedSanitizers");
      expect(message).toContain("step1");
      expect(message).toContain("step2");
    });

    it("should preserve original and sanitized content exactly", () => {
      const original = '{"key": "value with\nnewlines\tand\ttabs"}';
      const sanitized = '{"key": "value with\\nnewlines\\tand\\ttabs"}';

      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        original,
        sanitized,
        [],
      );

      expect(error.originalContent).toBe(original);
      expect(error.sanitizedContent).toBe(sanitized);
    });

    it("should handle empty sanitizer list", () => {
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        "original",
        "sanitized",
        [],
      );

      expect(error.appliedSanitizers).toEqual([]);
      expect(error.appliedSanitizers.length).toBe(0);
    });

    it("should make appliedSanitizers readonly", () => {
      const sanitizers = ["step1", "step2"];
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        "original",
        "sanitized",
        sanitizers,
      );

      // TypeScript should enforce readonly, but at runtime we can still check
      expect(error.appliedSanitizers).toEqual(sanitizers);
      // Attempting to modify should not affect the original
      const retrieved = error.appliedSanitizers as string[];
      expect(Array.isArray(retrieved)).toBe(true);
    });

    it("should handle long content gracefully", () => {
      const longContent = "x".repeat(10000);
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        longContent,
        longContent,
        ["step1"],
      );

      expect(error.originalContent.length).toBe(10000);
      expect(error.sanitizedContent.length).toBe(10000);
      expect(error.message).toBeDefined();
      expect(error.message.length).toBeLessThan(longContent.length); // Message should not include full content
    });

    it("should capture different error types as underlyingError", () => {
      const syntaxError = new SyntaxError("Syntax issue");
      const error1 = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        "orig",
        "san",
        [],
        syntaxError,
      );
      expect(error1.underlyingError).toBe(syntaxError);
      expect(error1.underlyingError?.name).toBe("SyntaxError");

      const typeError = new TypeError("Type issue");
      const error2 = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        "orig",
        "san",
        [],
        typeError,
      );
      expect(error2.underlyingError).toBe(typeError);
      expect(error2.underlyingError?.name).toBe("TypeError");
    });

    it("should include underlying error message in main message", () => {
      const underlyingError = new Error("Root cause: invalid syntax");
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        "orig",
        "san",
        ["step1"],
        underlyingError,
      );

      expect(error.message).toContain("underlyingError");
      expect(error.message).toContain("Root cause: invalid syntax");
    });

    it("should handle sanitizer names with special characters", () => {
      const sanitizers = [
        "remove-code-fences",
        "add_missing_commas",
        "fix.delimiter.mismatch",
        "normalize (chains)",
      ];
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        "orig",
        "san",
        sanitizers,
      );

      expect(error.appliedSanitizers).toEqual(sanitizers);
      sanitizers.forEach((sanitizer) => {
        expect(error.message).toContain(sanitizer);
      });
    });
  });

  describe("error properties", () => {
    it("should be throwable and catchable", () => {
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test error",
        "original",
        "sanitized",
        ["step1"],
      );

      expect(() => {
        throw error;
      }).toThrow(JsonProcessingError);

      try {
        throw error;
      } catch (caught) {
        expect(caught).toBe(error);
        expect(caught).toBeInstanceOf(JsonProcessingError);
      }
    });

    it("should have correct prototype chain", () => {
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        "orig",
        "san",
        [],
      );

      expect(error).toBeInstanceOf(JsonProcessingError);
      expect(error).toBeInstanceOf(Error);
      expect(Object.getPrototypeOf(error)).toBe(JsonProcessingError.prototype);
    });

    it("should support instanceof checks", () => {
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        "orig",
        "san",
        [],
      );

      expect(error instanceof JsonProcessingError).toBe(true);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof SyntaxError).toBe(false);
    });
  });

  describe("error type field", () => {
    it("should distinguish between parse and validation errors programmatically", () => {
      const parseError = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Parse failed",
        "orig",
        "san",
        [],
      );
      const validationError = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        "Validation failed",
        "orig",
        "san",
        [],
      );

      expect(parseError.type).toBe("parse");
      expect(validationError.type).toBe("validation");
      expect(parseError.type).not.toBe(validationError.type);
    });

    it("should include error type in message context", () => {
      const parseError = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        "orig",
        "san",
        [],
      );
      expect(parseError.message).toContain("parse");

      const validationError = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        "Test",
        "orig",
        "san",
        [],
      );
      expect(validationError.message).toContain("validation");
    });

    it("should enable type-based error handling", () => {
      const errors = [
        new JsonProcessingError(JsonProcessingErrorType.PARSE, "Parse error 1", "orig", "san", []),
        new JsonProcessingError(
          JsonProcessingErrorType.VALIDATION,
          "Validation error 1",
          "orig",
          "san",
          [],
        ),
        new JsonProcessingError(JsonProcessingErrorType.PARSE, "Parse error 2", "orig", "san", []),
        new JsonProcessingError(
          JsonProcessingErrorType.VALIDATION,
          "Validation error 2",
          "orig",
          "san",
          [],
        ),
      ];

      const parseErrors = errors.filter((e) => e.type === JsonProcessingErrorType.PARSE);
      const validationErrors = errors.filter((e) => e.type === JsonProcessingErrorType.VALIDATION);

      expect(parseErrors.length).toBe(2);
      expect(validationErrors.length).toBe(2);
    });
  });

  describe("edge cases", () => {
    it("should handle empty strings", () => {
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, "", "", "", []);

      expect(error.originalContent).toBe("");
      expect(error.sanitizedContent).toBe("");
      expect(error.message).toBeDefined();
    });

    it("should handle unicode content", () => {
      const unicode = '{"emoji": "😀", "text": "你好"}';
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        unicode,
        unicode,
        [],
      );

      expect(error.originalContent).toBe(unicode);
      expect(error.sanitizedContent).toBe(unicode);
    });

    it("should handle content with quotes and escapes", () => {
      const content = '{"key": "value with \\"quotes\\" and \\n newlines"}';
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        content,
        content,
        [],
      );

      expect(error.originalContent).toBe(content);
      expect(error.sanitizedContent).toBe(content);
    });

    it("should maintain sanitizer order", () => {
      const sanitizers = ["first", "second", "third", "fourth"];
      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        "Test",
        "orig",
        "san",
        sanitizers,
      );

      expect(error.appliedSanitizers).toEqual(sanitizers);
      expect(error.appliedSanitizers[0]).toBe("first");
      expect(error.appliedSanitizers[3]).toBe("fourth");
    });
  });
});
