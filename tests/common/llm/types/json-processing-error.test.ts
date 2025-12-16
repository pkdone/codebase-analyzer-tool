import {
  JsonProcessingError,
  JsonProcessingErrorType,
} from "../../../../src/common/llm/json-processing/types/json-processing.errors";

describe("JsonProcessingError", () => {
  describe("constructor", () => {
    it("should create parse error with type and message", () => {
      const message = "Failed to parse JSON";
      const underlyingError = new SyntaxError("Unexpected token");

      const error = new JsonProcessingError(
        JsonProcessingErrorType.PARSE,
        message,
        underlyingError,
      );

      expect(error).toBeInstanceOf(JsonProcessingError);
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("JsonProcessingError");
      expect(error.type).toBe("parse");
      expect(error.message).toBe(message);
      expect(error.cause).toBe(underlyingError);
    });

    it("should create validation error with type and message", () => {
      const message = "Schema validation failed";
      const underlyingError = new Error("Schema mismatch");

      const error = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        message,
        underlyingError,
      );

      expect(error).toBeInstanceOf(JsonProcessingError);
      expect(error.type).toBe("validation");
      expect(error.message).toBe(message);
      expect(error.cause).toBe(underlyingError);
    });

    it("should work without underlying error", () => {
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Failed to parse JSON");

      expect(error.cause).toBeUndefined();
      expect(error.message).toBe("Failed to parse JSON");
    });

    it("should preserve error message exactly", () => {
      const message = "Complex error message with\nnewlines\tand\ttabs";
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, message);

      expect(error.message).toBe(message);
    });
  });

  describe("error properties", () => {
    it("should be throwable and catchable", () => {
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Test error");

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
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Test");

      expect(error).toBeInstanceOf(JsonProcessingError);
      expect(error).toBeInstanceOf(Error);
      expect(Object.getPrototypeOf(error)).toBe(JsonProcessingError.prototype);
    });

    it("should support instanceof checks", () => {
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Test");

      expect(error instanceof JsonProcessingError).toBe(true);
      expect(error instanceof Error).toBe(true);
      expect(error instanceof SyntaxError).toBe(false);
    });
  });

  describe("error type field", () => {
    it("should distinguish between parse and validation errors programmatically", () => {
      const parseError = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Parse failed");
      const validationError = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        "Validation failed",
      );

      expect(parseError.type).toBe("parse");
      expect(validationError.type).toBe("validation");
      expect(parseError.type).not.toBe(validationError.type);
    });

    it("should enable type-based error handling", () => {
      const errors = [
        new JsonProcessingError(JsonProcessingErrorType.PARSE, "Parse error 1"),
        new JsonProcessingError(JsonProcessingErrorType.VALIDATION, "Validation error 1"),
        new JsonProcessingError(JsonProcessingErrorType.PARSE, "Parse error 2"),
        new JsonProcessingError(JsonProcessingErrorType.VALIDATION, "Validation error 2"),
      ];

      const parseErrors = errors.filter((e) => e.type === JsonProcessingErrorType.PARSE);
      const validationErrors = errors.filter((e) => e.type === JsonProcessingErrorType.VALIDATION);

      expect(parseErrors.length).toBe(2);
      expect(validationErrors.length).toBe(2);
    });
  });

  describe("cause property", () => {
    it("should capture different error types as cause", () => {
      const syntaxError = new SyntaxError("Syntax issue");
      const error1 = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Test", syntaxError);
      expect(error1.cause).toBe(syntaxError);
      expect((error1.cause as Error).name).toBe("SyntaxError");

      const typeError = new TypeError("Type issue");
      const error2 = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Test", typeError);
      expect(error2.cause).toBe(typeError);
      expect((error2.cause as Error).name).toBe("TypeError");
    });

    it("should preserve cause error message", () => {
      const underlyingError = new Error("Root cause: invalid syntax");
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Test", underlyingError);

      expect(error.cause).toBe(underlyingError);
      expect((error.cause as Error).message).toBe("Root cause: invalid syntax");
    });
  });

  describe("edge cases", () => {
    it("should handle empty message", () => {
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, "");

      expect(error.message).toBe("");
      expect(error.type).toBe("parse");
    });

    it("should handle unicode in message", () => {
      const unicode = "Error with emoji 😀 and text 你好";
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, unicode);

      expect(error.message).toBe(unicode);
    });

    it("should handle message with quotes and escapes", () => {
      const message = 'Error with "quotes" and \\n newlines';
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, message);

      expect(error.message).toBe(message);
    });
  });
});
