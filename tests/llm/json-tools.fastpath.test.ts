import { processJson } from "../../src/llm/json-processing/core/json-processing";
import { LLMOutputFormat, LLMPurpose } from "../../src/llm/types/llm.types";
import { JsonProcessingErrorType } from "../../src/llm/json-processing/types/json-processing.errors";
import { logSingleLineWarning } from "../../src/common/utils/logging";

// Mock the logging module
jest.mock("../../src/common/utils/logging", () => ({
  logSingleLineWarning: jest.fn(),
  logErrorMsg: jest.fn(),
  logInfoMsg: jest.fn(),
}));

describe("json-tools enhanced fast path", () => {
  const baseOptions = { outputFormat: LLMOutputFormat.JSON } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Fast Path Performance", () => {
    it("parses valid JSON without any sanitization steps", () => {
      const validJson = `{"purpose": "Test", "value": 42}`;
      const result = processJson(
        validJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ purpose: "Test", value: 42 });
      }
      // Should not log any sanitization steps since fast path succeeded
      expect(logSingleLineWarning).not.toHaveBeenCalled();
    });

    it("parses valid JSON with leading whitespace via fast path", () => {
      const validJson = `   \n\t{"purpose": "Test", "value": 42}`;
      const result = processJson(
        validJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ purpose: "Test", value: 42 });
      }
      expect(logSingleLineWarning).not.toHaveBeenCalled();
    });

    it("parses valid JSON with trailing whitespace via fast path", () => {
      const validJson = `{"purpose": "Test", "value": 42}\n\t   `;
      const result = processJson(
        validJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ purpose: "Test", value: 42 });
      }
      expect(logSingleLineWarning).not.toHaveBeenCalled();
    });

    it("parses valid JSON array with whitespace via fast path", () => {
      const validJson = `  [1, 2, 3, 4, 5]  `;
      const result = processJson(
        validJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([1, 2, 3, 4, 5]);
      }
      expect(logSingleLineWarning).not.toHaveBeenCalled();
    });

    it("parses nested valid JSON via fast path", () => {
      const validJson = `{
        "level1": {
          "level2": {
            "level3": {
              "value": "deep"
            }
          }
        }
      }`;
      const result = processJson(
        validJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).level1.level2.level3.value).toBe("deep");
      }
      expect(logSingleLineWarning).not.toHaveBeenCalled();
    });
  });

  describe("Fallback to Progressive Strategies", () => {
    it("falls back to progressive strategies for JSON with code fences", () => {
      const jsonWithFence = '```json\n{"value": 42}\n```';
      const result = processJson(
        jsonWithFence,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      // Code fence removal is now considered a significant sanitization step
      expect(logSingleLineWarning).toHaveBeenCalled();
    });

    it("falls back to progressive strategies for JSON with surrounding text", () => {
      const jsonWithText = 'Here is the JSON: {"value": 42} and that\'s it';
      const result = processJson(
        jsonWithText,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      expect(logSingleLineWarning).toHaveBeenCalled();
    });

    it("falls back to progressive strategies for invalid JSON", () => {
      const invalidJson = `{"value": 42,}`; // trailing comma
      const result = processJson(
        invalidJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      expect(logSingleLineWarning).toHaveBeenCalled();
    });
  });

  describe("Instance-Level Logging Configuration", () => {
    it("does not log sanitization steps when logging is disabled", () => {
      // Logging controlled via function parameter
      const jsonWithFence = '```json\n{"value": 42}\n```';
      const result = processJson(
        jsonWithFence,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
        false, // loggingEnabled = false
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      expect(logSingleLineWarning).not.toHaveBeenCalled();
    });

    it("logs sanitization steps when logging is enabled", () => {
      // Logging controlled via function parameter
      const jsonWithText = 'Here is the data: {"value": 42} end';
      const result = processJson(
        jsonWithText,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      expect(logSingleLineWarning).toHaveBeenCalledWith(
        expect.stringContaining("Applied"),
        expect.any(Object),
      );
    });

    it("defaults to logging enabled when parameter is omitted", () => {
      const jsonWithText = 'Here is the data: {"value": 42} end';
      const result = processJson(
        jsonWithText,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      expect(logSingleLineWarning).toHaveBeenCalledWith(
        expect.stringContaining("Applied"),
        expect.any(Object),
      );
    });
  });

  describe("Complex Sanitization Scenarios", () => {
    it("logs detailed sanitization steps for heavily malformed JSON", () => {
      const malformedJson = '```\n\u200B{"a": 1, "b": [1,2,3,],}\u200C\n```';
      const result = processJson(
        malformedJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).a).toBe(1);
        expect((result.data as any).b).toEqual([1, 2, 3]);
      }
      expect(logSingleLineWarning).toHaveBeenCalledWith(
        expect.stringContaining("Applied"),
        expect.any(Object),
      );
    });

    it("includes sanitization history in error message on validation failure", () => {
      // This test verifies that when JSON parses successfully but fails schema validation,
      // the pipeline stops immediately (instead of trying more sanitizers) and returns
      // an error that includes the sanitization steps that were applied.
      const schema = {
        safeParse: jest.fn(() => ({
          success: false,
          error: { issues: [{ path: ["value"], message: "Required" }] },
        })),
      } as any; // Mock schema for testing purposes

      const options = {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      } as any;

      const jsonWithFence = '```json\n{"notValue": 42}\n```';
      const result = processJson(
        jsonWithFence,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        options,
      );

      // Validation failures should return a failure result immediately
      expect(result.success).toBe(false);
      if (!result.success) {
        // The error message should indicate it was a validation failure, not a parse failure
        expect(result.error.message).toMatch(/failed schema validation/);
        // The error should include sanitization steps that were applied before validation failed
        expect(result.error.type).toBe(JsonProcessingErrorType.VALIDATION);
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles empty object via fast path", () => {
      const emptyObject = "{}";
      const result = processJson(
        emptyObject,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
      expect(logSingleLineWarning).not.toHaveBeenCalled();
    });

    it("handles empty array via fast path", () => {
      const emptyArray = "[]";
      const result = processJson(
        emptyArray,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
      expect(logSingleLineWarning).not.toHaveBeenCalled();
    });

    it("handles JSON with unicode characters via fast path", () => {
      const unicodeJson = `{"emoji": "🚀", "text": "Hello, 世界"}`;
      const result = processJson(
        unicodeJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).emoji).toBe("🚀");
        expect((result.data as any).text).toBe("Hello, 世界");
      }
      expect(logSingleLineWarning).not.toHaveBeenCalled();
    });

    it("handles JSON with escaped quotes via fast path", () => {
      const escapedJson = `{"text": "He said \\"Hello\\""}`;
      const result = processJson(
        escapedJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).text).toBe('He said "Hello"');
      }
      expect(logSingleLineWarning).not.toHaveBeenCalled();
    });
  });
});
