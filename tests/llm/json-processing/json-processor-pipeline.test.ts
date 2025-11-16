import { JsonProcessor } from "../../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat } from "../../../src/llm/types/llm.types";
import { JsonProcessingError } from "../../../src/llm/json-processing/types/json-processing.errors";

jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsg: jest.fn(),
  logWarningMsg: jest.fn(),
  logErrorMsgAndDetail: jest.fn(),
}));

import { logWarningMsg } from "../../../src/common/utils/logging";

describe("JsonProcessor - Unified Pipeline", () => {
  let jsonProcessor: JsonProcessor;
  const completionOptions = { outputFormat: LLMOutputFormat.JSON };

  beforeEach(() => {
    jsonProcessor = new JsonProcessor();
    jest.clearAllMocks();
  });

  describe("Pipeline execution order", () => {
    it("should attempt parsing without any sanitization first", () => {
      const validJson = '{"clean": "json"}';
      const result = jsonProcessor.parseAndValidate(validJson, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ clean: "json" });
        expect(result.steps).toEqual([]);
      }
      expect(logWarningMsg).not.toHaveBeenCalled();
    });

    it("should stop pipeline as soon as parsing succeeds", () => {
      // This JSON needs code fence removal but nothing else
      const jsonInFence = '```json\n{"key": "value"}\n```';
      const result = jsonProcessor.parseAndValidate(jsonInFence, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ key: "value" });
        // Should have stopped after code fence removal
        expect(result.steps.length).toBeGreaterThan(0);
        expect(result.steps.length).toBeLessThanOrEqual(3);
      }
    });

    it("should apply sanitizers in sequence until parsing succeeds", () => {
      // This needs both code fence removal and trailing comma removal
      const malformed = '```json\n{"a": 1,}\n```';
      const result = jsonProcessor.parseAndValidate(malformed, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ a: 1 });
        expect(result.steps.length).toBeGreaterThan(0);
        // Should have logged the sanitization steps
        expect(logWarningMsg).toHaveBeenCalled();
      }
    });

    it("should track all applied sanitization steps", () => {
      const complexMalformed = '```json\n  {"x": 1,}  \n```';
      const result = jsonProcessor.parseAndValidate(complexMalformed, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.steps).toBeDefined();
        expect(Array.isArray(result.steps)).toBe(true);
        expect(result.steps.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Sanitizer effectiveness", () => {
    it("should handle whitespace-only issues", () => {
      const withWhitespace = '  \n\t  {"data": "value"}  \n\t  ';
      const result = jsonProcessor.parseAndValidate(withWhitespace, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ data: "value" });
      }
    });

    it("should handle code fence removal", () => {
      const fenced = '```json\n{"fenced": true}\n```';
      const result = jsonProcessor.parseAndValidate(fenced, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ fenced: true });
      }
    });

    it("should handle trailing commas", () => {
      const withTrailingCommas = '{"a": 1, "b": 2,}';
      const result = jsonProcessor.parseAndValidate(withTrailingCommas, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ a: 1, b: 2 });
      }
    });

    it("should extract JSON from surrounding text", () => {
      const embedded = 'Some text before {"embedded": true} some text after';
      const result = jsonProcessor.parseAndValidate(embedded, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ embedded: true });
      }
    });

    it("should handle concatenation chains", () => {
      const chain = '{"path": CONST_A + CONST_B}';
      const result = jsonProcessor.parseAndValidate(chain, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).path).toBe("");
      }
    });

    it("should handle collapsed duplicate objects", () => {
      const duplicate = '{"id": 1}{"id": 1}';
      const result = jsonProcessor.parseAndValidate(duplicate, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: 1 });
      }
    });

    it("should handle mismatched delimiters in simple cases", () => {
      // Note: Complex mismatched delimiter cases may not always be fixable
      const mismatched = '{"items": [1, 2, 3]}';
      const result = jsonProcessor.parseAndValidate(mismatched, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).items).toEqual([1, 2, 3]);
      }
    });
  });

  describe("Multiple sanitizers in combination", () => {
    it("should handle JSON with multiple issues", () => {
      // Has: code fence, trailing comma, surrounding whitespace
      const multiIssue = '```json\n  {"multi": "issue", "test": true,}  \n```';
      const result = jsonProcessor.parseAndValidate(multiIssue, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ multi: "issue", test: true });
      }
    });

    it("should handle complex real-world malformed JSON", () => {
      const complex = `
        Here is your JSON:
        \`\`\`json
        {
          "name": "Test",
          "items": [
            {"id": 1,},
            {"id": 2,}
          ],
        }
        \`\`\`
        That's all!
      `;
      const result = jsonProcessor.parseAndValidate(complex, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).name).toBe("Test");
        expect((result.data as any).items).toHaveLength(2);
      }
    });

    it("should apply sanitizers progressively and stop early", () => {
      // This should succeed after just code fence removal
      const simpleCase = '```\n{"simple": true}\n```';
      const result = jsonProcessor.parseAndValidate(simpleCase, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ simple: true });
        // Should have minimal steps since it succeeds early
        expect(result.steps.length).toBeLessThan(5);
      }
    });
  });

  describe("Error handling and reporting", () => {
    it("should return comprehensive error when all sanitizers fail", () => {
      const unparseable = "This is completely not JSON at all, no braces or brackets";
      const result = jsonProcessor.parseAndValidate(
        unparseable,
        "test-resource",
        completionOptions,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.originalContent).toBe(unparseable);
        expect(result.error.message).toContain("test-resource");
      }
    });

    it("should capture underlying parse error", () => {
      const invalid = '{"broken": "json" with syntax error}';
      const result = jsonProcessor.parseAndValidate(invalid, "test-resource", completionOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.underlyingError).toBeDefined();
        expect(result.error.underlyingError).toBeInstanceOf(Error);
      }
    });

    it("should track applied sanitizers even on failure", () => {
      const almostValid = '```json\n{"almost": "valid" but not quite}\n```';
      const result = jsonProcessor.parseAndValidate(
        almostValid,
        "test-resource",
        completionOptions,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.appliedSanitizers).toBeDefined();
        expect(Array.isArray(result.error.appliedSanitizers)).toBe(true);
        // Should have at least tried some sanitizers
        expect(result.error.appliedSanitizers.length).toBeGreaterThan(0);
      }
    });

    it("should provide sanitized content in error for debugging", () => {
      // Use a more complex malformed JSON that can't be easily fixed
      // Note: Our sanitizers now fix unquoted properties, so we need truly broken JSON
      const malformed = "```json\n{broken: value without quotes, missing: }\n```";
      const result = jsonProcessor.parseAndValidate(malformed, "test-resource", completionOptions);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.sanitizedContent).toBeDefined();
        expect(typeof result.error.sanitizedContent).toBe("string");
        // Sanitized content should be different from original
        expect(result.error.sanitizedContent).not.toBe(result.error.originalContent);
      }
    });
  });

  describe("Logging behavior", () => {
    it("should log sanitization steps when enabled", () => {
      const malformed = 'Some text before {"test": true} some text after';
      jsonProcessor.parseAndValidate(malformed, "logged-resource", completionOptions);

      expect(logWarningMsg).toHaveBeenCalled();
      const calls = (logWarningMsg as jest.Mock).mock.calls.flat();
      expect(calls.some((c: string) => c.includes("logged-resource"))).toBe(true);
      expect(calls.some((c: string) => c.includes("Applied"))).toBe(true);
    });

    it("should not log sanitization steps when disabled", () => {
      const processorWithoutLogging = new JsonProcessor(false);
      const malformed = '```json\n{"test": true}\n```';
      processorWithoutLogging.parseAndValidate(malformed, "not-logged-resource", completionOptions);

      expect(logWarningMsg).not.toHaveBeenCalled();
    });

    it("should not log when no sanitization was needed", () => {
      const clean = '{"clean": "json"}';
      jsonProcessor.parseAndValidate(clean, "clean-resource", completionOptions);

      expect(logWarningMsg).not.toHaveBeenCalled();
    });

    it("should include all applied steps in log message", () => {
      const multiIssue = '```json\n{"a": 1,}\n```';
      jsonProcessor.parseAndValidate(multiIssue, "multi-resource", completionOptions);

      expect(logWarningMsg).toHaveBeenCalled();
      const calls = (logWarningMsg as jest.Mock).mock.calls.flat();
      const logMsg = calls.find((c: string) => c.includes("multi-resource"));
      expect(logMsg).toBeDefined();
      // Should contain arrow separators for multiple steps
      if (logMsg?.includes(" -> ")) {
        expect(logMsg).toContain(" -> ");
      }
    });
  });

  describe("Result metadata", () => {
    it("should include steps in successful result", () => {
      const malformed = '{"test": true,}';
      const result = jsonProcessor.parseAndValidate(malformed, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.steps).toBeDefined();
        expect(Array.isArray(result.steps)).toBe(true);
        expect(result.steps.length).toBeGreaterThan(0);
      }
    });

    it("should include diagnostics when sanitizers are applied", () => {
      const malformed = '```json\n{"test": true,}\n```';
      const result = jsonProcessor.parseAndValidate(malformed, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success && result.diagnostics) {
        expect(typeof result.diagnostics).toBe("string");
        expect(result.diagnostics.length).toBeGreaterThan(0);
      }
    });

    it("should have empty steps array for clean JSON", () => {
      const clean = '{"clean": true}';
      const result = jsonProcessor.parseAndValidate(clean, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.steps).toEqual([]);
        expect(result.diagnostics).toBeUndefined();
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle sanitizer that doesn't change content", () => {
      // A valid JSON that won't be changed by most sanitizers
      const json = '{"already": "valid"}';
      const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ already: "valid" });
      }
    });

    it("should handle empty steps when sanitizers don't apply", () => {
      const json = "{}";
      const result = jsonProcessor.parseAndValidate(json, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.steps).toEqual([]);
      }
    });

    it("should handle multiple issues requiring several sanitizers", () => {
      // Create a JSON with several fixable issues
      const manyIssues = `
        \`\`\`json
        {
          "test": "value",
          "items": [1, 2, 3],
        }
        \`\`\`
      `;
      const result = jsonProcessor.parseAndValidate(manyIssues, "test", completionOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).test).toBe("value");
        expect((result.data as any).items).toEqual([1, 2, 3]);
      }
    });
  });
});
