import {
  JsonProcessingError,
  JsonProcessingErrorType,
} from "../../../src/llm/json-processing/types/json-processing.errors";

describe("JsonProcessingErrorType Enum", () => {
  describe("Enum values", () => {
    it("should have PARSE error type", () => {
      expect(JsonProcessingErrorType.PARSE).toBe("parse");
    });

    it("should have VALIDATION error type", () => {
      expect(JsonProcessingErrorType.VALIDATION).toBe("validation");
    });

    it("should have exactly two error types", () => {
      const values = Object.values(JsonProcessingErrorType);
      // String enums only have the values in Object.values(), not the keys
      expect(values).toHaveLength(2);
      expect(values).toContain("parse");
      expect(values).toContain("validation");
    });
  });

  describe("Type safety", () => {
    it("should be type-safe when creating errors", () => {
      const parseError = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Test parse error");

      expect(parseError.type).toBe(JsonProcessingErrorType.PARSE);
      expect(parseError.type).toBe("parse");
    });

    it("should be type-safe when creating validation errors", () => {
      const validationError = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        "Test validation error",
      );

      expect(validationError.type).toBe(JsonProcessingErrorType.VALIDATION);
      expect(validationError.type).toBe("validation");
    });
  });

  describe("Enum consistency", () => {
    it("should have PARSE value that matches string literal", () => {
      expect(JsonProcessingErrorType.PARSE).toBe("parse");
    });

    it("should have VALIDATION value that matches string literal", () => {
      expect(JsonProcessingErrorType.VALIDATION).toBe("validation");
    });
  });

  describe("Error type checking", () => {
    it("should allow comparing error types with enum values", () => {
      const error = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Test");

      expect(error.type).toBe(JsonProcessingErrorType.PARSE);
      expect(error.type).not.toBe(JsonProcessingErrorType.VALIDATION);
    });

    it("should work with switch statements", () => {
      const parseError = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Test");

      let result: string;
      switch (parseError.type) {
        case JsonProcessingErrorType.PARSE:
          result = "parse error";
          break;
        case JsonProcessingErrorType.VALIDATION:
          result = "validation error";
          break;
      }

      expect(result).toBe("parse error");
    });

    it("should distinguish between parse and validation errors", () => {
      const parseError = new JsonProcessingError(JsonProcessingErrorType.PARSE, "Parse failed");

      const validationError = new JsonProcessingError(
        JsonProcessingErrorType.VALIDATION,
        "Validation failed",
      );

      expect(parseError.type).not.toBe(validationError.type);
      expect(parseError.type).toBe(JsonProcessingErrorType.PARSE);
      expect(validationError.type).toBe(JsonProcessingErrorType.VALIDATION);
    });
  });

  describe("Usage in discriminated unions", () => {
    it("should work in discriminated union type guards", () => {
      type TestResult =
        | { success: true; data: string }
        | { success: false; errorType: JsonProcessingErrorType.PARSE; error: Error }
        | { success: false; errorType: JsonProcessingErrorType.VALIDATION; error: Error };

      const parseFailure: TestResult = {
        success: false,
        errorType: JsonProcessingErrorType.PARSE,
        error: new Error("test"),
      };

      const validationFailure: TestResult = {
        success: false,
        errorType: JsonProcessingErrorType.VALIDATION,
        error: new Error("test"),
      };

      // Verify discriminated union works correctly
      expect(parseFailure.success).toBe(false);
      expect(parseFailure.errorType).toBe(JsonProcessingErrorType.PARSE);

      expect(validationFailure.success).toBe(false);
      expect(validationFailure.errorType).toBe(JsonProcessingErrorType.VALIDATION);
    });
  });
});
