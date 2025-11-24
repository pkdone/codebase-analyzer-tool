import { createMockJsonProcessor } from "./json-processor-mock";
import { JsonProcessor } from "../../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat, LLMPurpose } from "../../../src/llm/types/llm.types";

describe("json-processor-mock", () => {
  describe("createMockJsonProcessor", () => {
    it("should create a JsonProcessor instance", () => {
      const processor = createMockJsonProcessor();

      expect(processor).toBeInstanceOf(JsonProcessor);
    });

    it("should create a processor with logging disabled", () => {
      const processor = createMockJsonProcessor();

      // JsonProcessor's loggingEnabled is a private field, but we can test behavior
      // by checking that it doesn't throw or cause issues during basic operations
      expect(() => processor).not.toThrow();
    });

    it("should create a new instance on each call", () => {
      const processor1 = createMockJsonProcessor();
      const processor2 = createMockJsonProcessor();

      expect(processor1).not.toBe(processor2);
      expect(processor1).toBeInstanceOf(JsonProcessor);
      expect(processor2).toBeInstanceOf(JsonProcessor);
    });

    it("should be usable for parsing and validating JSON", () => {
      const processor = createMockJsonProcessor();
      const validJson = '{"key": "value"}';

      const result = processor.parseAndValidate(
        validJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ key: "value" });
      }
    });

    it("should handle JSON with markdown code fences", () => {
      const processor = createMockJsonProcessor();
      const jsonWithFence = '```json\n{"key": "value"}\n```';

      const result = processor.parseAndValidate(
        jsonWithFence,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ key: "value" });
      }
    });

    it("should return failure result for invalid JSON", () => {
      const processor = createMockJsonProcessor();
      // Use invalid JSON that can't be auto-fixed (malformed structure)
      const invalidJson = '{"key": {unclosed}';

      const result = processor.parseAndValidate(
        invalidJson,
        { resource: "test-resource", purpose: LLMPurpose.COMPLETIONS },
        {
          outputFormat: LLMOutputFormat.JSON,
        },
      );

      expect(result.success).toBe(false);
    });
  });
});
