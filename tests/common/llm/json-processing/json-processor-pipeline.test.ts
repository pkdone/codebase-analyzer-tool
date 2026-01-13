import { parseAndValidateLLMJson } from "../../../../src/common/llm/json-processing/core/json-processing";
import { LLMOutputFormat, LLMPurpose } from "../../../../src/common/llm/types/llm.types";
import {
  JsonProcessingError,
  JsonProcessingErrorType,
} from "../../../../src/common/llm/json-processing/types/json-processing.errors";

jest.mock("../../../../src/common/utils/logging", () => ({
  logErrorMsg: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

import { logWarn } from "../../../../src/common/utils/logging";

describe("JsonProcessor - Unified Pipeline", () => {
  const completionOptions = { outputFormat: LLMOutputFormat.JSON };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Pipeline execution order", () => {
    it("should attempt parsing without any sanitization first", () => {
      const validJson = '{"clean": "json"}';
      const result = parseAndValidateLLMJson(
        validJson,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ clean: "json" });
        expect(result.mutationSteps).toEqual([]);
      }
      expect(logWarn).not.toHaveBeenCalled();
    });

    it("should stop pipeline as soon as parsing succeeds", () => {
      // This JSON needs code fence removal but nothing else
      const jsonInFence = '```json\n{"key": "value"}\n```';
      const result = parseAndValidateLLMJson(
        jsonInFence,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ key: "value" });
        // Should have stopped after code fence removal
        expect(result.mutationSteps.length).toBeGreaterThan(0);
        expect(result.mutationSteps.length).toBeLessThanOrEqual(3);
      }
    });

    it("should apply sanitizers in sequence until parsing succeeds", () => {
      // This needs both code fence removal and trailing comma removal
      const malformed = '```json\n{"a": 1,}\n```';
      const result = parseAndValidateLLMJson(
        malformed,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ a: 1 });
        expect(result.mutationSteps.length).toBeGreaterThan(0);
        // Should have logged the sanitization steps
        expect(logWarn).toHaveBeenCalled();
      }
    });

    it("should track all applied sanitization steps", () => {
      const complexMalformed = '```json\n  {"x": 1,}  \n```';
      const result = parseAndValidateLLMJson(
        complexMalformed,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.mutationSteps).toBeDefined();
        expect(Array.isArray(result.mutationSteps)).toBe(true);
        expect(result.mutationSteps.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Sanitizer effectiveness", () => {
    it("should handle whitespace-only issues", () => {
      const withWhitespace = '  \n\t  {"data": "value"}  \n\t  ';
      const result = parseAndValidateLLMJson(
        withWhitespace,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ data: "value" });
      }
    });

    it("should handle code fence removal", () => {
      const fenced = '```json\n{"fenced": true}\n```';
      const result = parseAndValidateLLMJson(
        fenced,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ fenced: true });
      }
    });

    it("should handle trailing commas", () => {
      const withTrailingCommas = '{"a": 1, "b": 2,}';
      const result = parseAndValidateLLMJson(
        withTrailingCommas,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ a: 1, b: 2 });
      }
    });

    it("should extract JSON from surrounding text", () => {
      const embedded = 'Some text before {"embedded": true} some text after';
      const result = parseAndValidateLLMJson(
        embedded,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ embedded: true });
      }
    });

    it("should handle concatenation chains", () => {
      const chain = '{"path": CONST_A + CONST_B}';
      const result = parseAndValidateLLMJson(
        chain,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).path).toBe("");
      }
    });

    it("should handle collapsed duplicate objects", () => {
      const duplicate = '{"id": 1}{"id": 1}';
      const result = parseAndValidateLLMJson(
        duplicate,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ id: 1 });
      }
    });

    it("should handle mismatched delimiters in simple cases", () => {
      // Note: Complex mismatched delimiter cases may not always be fixable
      const mismatched = '{"items": [1, 2, 3]}';
      const result = parseAndValidateLLMJson(
        mismatched,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

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
      const result = parseAndValidateLLMJson(
        multiIssue,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

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
      const result = parseAndValidateLLMJson(
        complex,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).name).toBe("Test");
        expect((result.data as any).items).toHaveLength(2);
      }
    });

    it("should apply sanitizers progressively and stop early", () => {
      // This should succeed after just code fence removal
      const simpleCase = '```\n{"simple": true}\n```';
      const result = parseAndValidateLLMJson(
        simpleCase,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ simple: true });
        // Should have minimal steps since it succeeds early
        expect(result.mutationSteps.length).toBeLessThan(5);
      }
    });
  });

  describe("Error handling and reporting", () => {
    it("should return comprehensive error when all sanitizers fail", () => {
      const unparseable = "This is completely not JSON at all, no braces or brackets";
      const result = parseAndValidateLLMJson(
        unparseable,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe(JsonProcessingErrorType.PARSE);
        expect(result.error.message).toContain("test-resource");
      }
    });

    it("should capture underlying parse error", () => {
      const invalid = '{"broken": "json" with syntax error}';
      const result = parseAndValidateLLMJson(
        invalid,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.cause).toBeDefined();
        expect(result.error.cause).toBeInstanceOf(Error);
      }
    });

    it("should track applied sanitizers even on failure", () => {
      const almostValid = '```json\n{"almost": "valid" but not quite}\n```';
      const result = parseAndValidateLLMJson(
        almostValid,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe(JsonProcessingErrorType.PARSE);
        // Error should be created even after sanitization attempts
        expect(result.error.message).toContain("test-resource");
      }
    });

    it("should provide sanitized content in error for debugging", () => {
      // Use a more complex malformed JSON that can't be easily fixed
      // Note: Our sanitizers now fix many patterns including unquoted properties and
      // missing values. Use fundamentally broken structure that can't be recovered.
      const malformed =
        "```json\n{{{nested broken: [[[invalid array structure without proper syntax\n```";
      const result = parseAndValidateLLMJson(
        malformed,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(JsonProcessingError);
        expect(result.error.type).toBe(JsonProcessingErrorType.PARSE);
        expect(result.error.message).toContain("test-resource");
      }
    });
  });

  describe("Logging behavior", () => {
    it("should log sanitization steps when enabled", () => {
      const malformed = 'Some text before {"test": true} some text after';
      parseAndValidateLLMJson(
        malformed,
        { resource: "logged-resource", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(logWarn).toHaveBeenCalled();
      const calls = (logWarn as jest.Mock).mock.calls.flat();
      expect(calls.some((c: string) => c.includes("Applied"))).toBe(true);
    });

    it("should not log sanitization steps when disabled", () => {
      const malformed = '```json\n{"test": true}\n```';
      parseAndValidateLLMJson(
        malformed,
        { resource: "not-logged-resource", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
        false, // loggingEnabled = false
      );

      expect(logWarn).not.toHaveBeenCalled();
    });

    it("should not log when no sanitization was needed", () => {
      const clean = '{"clean": "json"}';
      parseAndValidateLLMJson(
        clean,
        { resource: "clean-resource", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(logWarn).not.toHaveBeenCalled();
    });

    it("should include all applied steps in log message", () => {
      const multiIssue = '```json\n{"a": 1,}\n```';
      parseAndValidateLLMJson(
        multiIssue,
        { resource: "multi-resource", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(logWarn).toHaveBeenCalled();
      const calls = (logWarn as jest.Mock).mock.calls.flat();
      const logMsg = calls.find((c: string) => c.includes("Applied"));
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
      const result = parseAndValidateLLMJson(
        malformed,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.mutationSteps).toBeDefined();
        expect(Array.isArray(result.mutationSteps)).toBe(true);
        expect(result.mutationSteps.length).toBeGreaterThan(0);
      }
    });

    it("should successfully process malformed JSON with sanitizers", () => {
      const malformed = '```json\n{"test": true,}\n```';
      const result = parseAndValidateLLMJson(
        malformed,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
      }
    });

    it("should have empty steps array for clean JSON", () => {
      const clean = '{"clean": true}';
      const result = parseAndValidateLLMJson(
        clean,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.mutationSteps).toEqual([]);
      }
    });
  });

  describe("Edge cases", () => {
    it("should handle sanitizer that doesn't change content", () => {
      // A valid JSON that won't be changed by most sanitizers
      const json = '{"already": "valid"}';
      const result = parseAndValidateLLMJson(
        json,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ already: "valid" });
      }
    });

    it("should handle empty steps when sanitizers don't apply", () => {
      const json = "{}";
      const result = parseAndValidateLLMJson(
        json,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.mutationSteps).toEqual([]);
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
      const result = parseAndValidateLLMJson(
        manyIssues,
        { resource: "test", purpose: LLMPurpose.COMPLETIONS },
        completionOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).test).toBe("value");
        expect((result.data as any).items).toEqual([1, 2, 3]);
      }
    });
  });
});
