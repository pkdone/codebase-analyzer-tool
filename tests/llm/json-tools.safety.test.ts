import { JsonProcessor } from "../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat } from "../../src/llm/types/llm.types";

// Tests for handling concatenated JSON objects through the public API.
// The parsing pipeline includes sanitization that extracts the largest/first valid JSON span,
// effectively handling cases where multiple objects might be present.

describe("json-tools concatenated objects handling", () => {
  let jsonProcessor: JsonProcessor;

  beforeEach(() => {
    jsonProcessor = new JsonProcessor();
  });
  it("successfully extracts the first valid object from concatenated objects", () => {
    // When multiple objects are concatenated, the parser extracts the first complete one
    const concatenated = '{"a":1}{"b":2}';

    const result = jsonProcessor.parseAndValidate(
      concatenated,
      "concat-resource",
      { outputFormat: LLMOutputFormat.JSON },
      false,
    );

    // Should extract the first object
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ a: 1 });
    }
  });

  it("handles malformed concatenated objects with trailing commas", () => {
    // Malformed JSON with concatenated objects triggers sanitization
    const malformedConcatenated = '{"a":1,}{"b":2,}';

    const result = jsonProcessor.parseAndValidate(
      malformedConcatenated,
      "malformed-concat-resource",
      { outputFormat: LLMOutputFormat.JSON },
      false,
    );

    // Should sanitize and extract the first valid object
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ a: 1 });
    }
  });

  it("successfully parses when identical objects are concatenated", () => {
    // When identical objects are concatenated, parsing handles it gracefully
    const duplicateConcatenated = '{"a":1}{"a":1}';

    const result = jsonProcessor.parseAndValidate(
      duplicateConcatenated,
      "duplicate-concat-resource",
      { outputFormat: LLMOutputFormat.JSON },
      false,
    );

    // Should successfully extract one of the objects
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ a: 1 });
    }
  });

  it("extracts valid JSON from text with surrounding content", () => {
    // Parser should extract JSON even when surrounded by other text
    const textWithJson = 'Here is some data: {"value": 42} and more text';

    const result = jsonProcessor.parseAndValidate(
      textWithJson,
      "text-wrapped-resource",
      { outputFormat: LLMOutputFormat.JSON },
      false,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ value: 42 });
    }
  });
});
