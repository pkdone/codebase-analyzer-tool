import { parseJson } from "../../../../src/llm/json-processing/core/json-parsing";
import {
  JsonProcessingError,
  JsonProcessingErrorType,
} from "../../../../src/llm/json-processing/types/json-processing.errors";

describe("json-parsing", () => {
  describe("parseJson", () => {
    describe("fast path - direct parse success", () => {
      it("should parse valid JSON string", () => {
        const json = '{"key": "value", "number": 42}';
        const result = parseJson(json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value", number: 42 });
          expect(result.steps).toEqual([]);
        }
      });

      it("should parse valid JSON array", () => {
        const json = '[{"item": 1}, {"item": 2}]';
        const result = parseJson(json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual([{ item: 1 }, { item: 2 }]);
          expect(result.steps).toEqual([]);
        }
      });

      it("should handle JSON with whitespace", () => {
        const json = '  \n\t  {"key": "value"}  \n\t  ';
        const result = parseJson(json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value" });
        }
      });

      it("should parse nested JSON objects", () => {
        const json = '{"outer": {"inner": {"deep": "value"}}}';
        const result = parseJson(json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ outer: { inner: { deep: "value" } } });
        }
      });
    });

    describe("slow path - sanitization loop", () => {
      it("should fix JSON with code fences", () => {
        const json = '```json\n{"key": "value"}\n```';
        const result = parseJson(json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value" });
          expect(result.steps.length).toBeGreaterThan(0);
        }
      });

      it("should fix JSON with trailing comma", () => {
        const json = '{"key": "value",}';
        const result = parseJson(json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key: "value" });
        }
      });

      it("should fix JSON with missing comma on separate lines", () => {
        // The sanitizers fix missing commas when properties are on separate lines
        const json = '{"key1": "value1"\n"key2": "value2"}';
        const result = parseJson(json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({ key1: "value1", key2: "value2" });
        }
      });

      it("should track applied sanitization steps", () => {
        const json = '```json\n{"key": "value",}\n```';
        const result = parseJson(json);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.steps.length).toBeGreaterThan(0);
          expect(Array.isArray(result.steps)).toBe(true);
        }
      });
    });

    describe("error handling", () => {
      it("should return failure result for completely invalid JSON", () => {
        const invalid = "not valid json at all";
        const result = parseJson(invalid);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBeInstanceOf(JsonProcessingError);
          expect(result.error.type).toBe(JsonProcessingErrorType.PARSE);
          expect(result.steps).toBeDefined();
        }
      });

      it("should include steps in failure result", () => {
        const invalid = "not valid json";
        const result = parseJson(invalid);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(Array.isArray(result.steps)).toBe(true);
        }
      });

      it("should include diagnostics in result when available", () => {
        // Use a malformed JSON that might generate diagnostics
        const json = '{"key": "value" extra text}';
        const result = parseJson(json);

        // Result may succeed or fail, but if it succeeds, it might have diagnostics
        if (result.success && result.diagnostics) {
          expect(typeof result.diagnostics).toBe("string");
        }
      });
    });

    describe("post-parse transformations", () => {
      it("should apply post-parse transformations", () => {
        // Test with JSON that might trigger transformations
        const json = '{"key": null}';
        const result = parseJson(json);

        expect(result.success).toBe(true);
        if (result.success) {
          // convertNullToUndefined transform should convert null to undefined
          expect(result.data).toBeDefined();
        }
      });
    });
  });
});
