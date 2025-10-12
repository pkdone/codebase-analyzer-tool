import { JsonProcessor } from "../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat } from "../../src/llm/types/llm.types";
import { SANITIZATION_STEP } from "../../src/llm/json-processing/sanitizers";
import { logWarningMsg } from "../../src/common/utils/logging";

// Mock the logging module
jest.mock("../../src/common/utils/logging", () => ({
  logWarningMsg: jest.fn(),
  logErrorMsg: jest.fn(),
  logInfoMsg: jest.fn(),
}));

describe("json-tools enhanced fast path", () => {
  let jsonProcessor: JsonProcessor;
  const baseOptions = { outputFormat: LLMOutputFormat.JSON } as any;

  beforeEach(() => {
    jsonProcessor = new JsonProcessor(true);
    jest.clearAllMocks();
  });

  describe("Fast Path Performance", () => {
    it("parses valid JSON without any sanitization steps", () => {
      const validJson = `{"purpose": "Test", "value": 42}`;
      const result = jsonProcessor.parseAndValidate(validJson, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ purpose: "Test", value: 42 });
      }
      // Should not log any sanitization steps since fast path succeeded
      expect(logWarningMsg).not.toHaveBeenCalled();
    });

    it("parses valid JSON with leading whitespace via fast path", () => {
      const validJson = `   \n\t{"purpose": "Test", "value": 42}`;
      const result = jsonProcessor.parseAndValidate(validJson, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ purpose: "Test", value: 42 });
      }
      expect(logWarningMsg).not.toHaveBeenCalled();
    });

    it("parses valid JSON with trailing whitespace via fast path", () => {
      const validJson = `{"purpose": "Test", "value": 42}\n\t   `;
      const result = jsonProcessor.parseAndValidate(validJson, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ purpose: "Test", value: 42 });
      }
      expect(logWarningMsg).not.toHaveBeenCalled();
    });

    it("parses valid JSON array with whitespace via fast path", () => {
      const validJson = `  [1, 2, 3, 4, 5]  `;
      const result = jsonProcessor.parseAndValidate(validJson, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([1, 2, 3, 4, 5]);
      }
      expect(logWarningMsg).not.toHaveBeenCalled();
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
      const result = jsonProcessor.parseAndValidate(validJson, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).level1.level2.level3.value).toBe("deep");
      }
      expect(logWarningMsg).not.toHaveBeenCalled();
    });
  });

  describe("Fallback to Progressive Strategies", () => {
    it("falls back to progressive strategies for JSON with code fences", () => {
      const jsonWithFence = '```json\n{"value": 42}\n```';
      const result = jsonProcessor.parseAndValidate(jsonWithFence, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      // Should log sanitization steps since progressive strategies were used
      expect(logWarningMsg).toHaveBeenCalled();
    });

    it("falls back to progressive strategies for JSON with surrounding text", () => {
      const jsonWithText = 'Here is the JSON: {"value": 42} and that\'s it';
      const result = jsonProcessor.parseAndValidate(jsonWithText, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      expect(logWarningMsg).toHaveBeenCalled();
    });

    it("falls back to progressive strategies for invalid JSON", () => {
      const invalidJson = `{"value": 42,}`; // trailing comma
      const result = jsonProcessor.parseAndValidate(invalidJson, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      expect(logWarningMsg).toHaveBeenCalled();
    });
  });

  describe("Instance-Level Logging Configuration", () => {
    it("does not log sanitization steps when logging is disabled", () => {
      const processorWithoutLogging = new JsonProcessor(false);
      const jsonWithFence = '```json\n{"value": 42}\n```';
      const result = processorWithoutLogging.parseAndValidate(
        jsonWithFence,
        "test-resource",
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      expect(logWarningMsg).not.toHaveBeenCalled();
    });

    it("logs sanitization steps when logging is enabled", () => {
      const processorWithLogging = new JsonProcessor(true);
      const jsonWithFence = '```json\n{"value": 42}\n```';
      const result = processorWithLogging.parseAndValidate(
        jsonWithFence,
        "test-resource",
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      expect(logWarningMsg).toHaveBeenCalledWith(
        expect.stringContaining("[test-resource] Applied"),
      );
    });

    it("defaults to logging enabled when constructor parameter is omitted", () => {
      const processorDefaultLogging = new JsonProcessor();
      const jsonWithFence = '```json\n{"value": 42}\n```';
      const result = processorDefaultLogging.parseAndValidate(
        jsonWithFence,
        "test-resource",
        baseOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ value: 42 });
      }
      expect(logWarningMsg).toHaveBeenCalledWith(
        expect.stringContaining("[test-resource] Applied"),
      );
    });
  });

  describe("Complex Sanitization Scenarios", () => {
    it("logs detailed sanitization steps for heavily malformed JSON", () => {
      const malformedJson = '```\n\u200B{"a": 1, "b": [1,2,3,],}\u200C\n```';
      const result = jsonProcessor.parseAndValidate(malformedJson, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).a).toBe(1);
        expect((result.data as any).b).toEqual([1, 2, 3]);
      }
      expect(logWarningMsg).toHaveBeenCalledWith(expect.stringContaining("Applied"));
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
      const result = jsonProcessor.parseAndValidate(jsonWithFence, "test-resource", options);

      // Validation failures should return a failure result immediately
      expect(result.success).toBe(false);
      if (!result.success) {
        // The error message should indicate it was a validation failure, not a parse failure
        expect(result.error.message).toMatch(/failed schema validation/);
        // The error should include sanitization steps that were applied before validation failed
        expect(result.error.appliedSanitizers).toContain(SANITIZATION_STEP.REMOVED_CODE_FENCES);
      }
    });
  });

  describe("Edge Cases", () => {
    it("handles empty object via fast path", () => {
      const emptyObject = "{}";
      const result = jsonProcessor.parseAndValidate(emptyObject, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({});
      }
      expect(logWarningMsg).not.toHaveBeenCalled();
    });

    it("handles empty array via fast path", () => {
      const emptyArray = "[]";
      const result = jsonProcessor.parseAndValidate(emptyArray, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual([]);
      }
      expect(logWarningMsg).not.toHaveBeenCalled();
    });

    it("handles JSON with unicode characters via fast path", () => {
      const unicodeJson = `{"emoji": "🚀", "text": "Hello, 世界"}`;
      const result = jsonProcessor.parseAndValidate(unicodeJson, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).emoji).toBe("🚀");
        expect((result.data as any).text).toBe("Hello, 世界");
      }
      expect(logWarningMsg).not.toHaveBeenCalled();
    });

    it("handles JSON with escaped quotes via fast path", () => {
      const escapedJson = `{"text": "He said \\"Hello\\""}`;
      const result = jsonProcessor.parseAndValidate(escapedJson, "test-resource", baseOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).text).toBe('He said "Hello"');
      }
      expect(logWarningMsg).not.toHaveBeenCalled();
    });
  });
});
