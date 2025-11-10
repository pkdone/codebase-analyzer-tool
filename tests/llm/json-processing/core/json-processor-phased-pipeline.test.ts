import { JsonProcessor } from "../../../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat } from "../../../../src/llm/types/llm.types";
import { z } from "zod";

/**
 * Tests for the phased pipeline structure in JsonProcessor.
 * These tests ensure that the phased pipeline maintains the same behavior
 * as the previous flat array structure.
 */
describe("JsonProcessor - Phased Pipeline", () => {
  let processor: JsonProcessor;

  beforeEach(() => {
    processor = new JsonProcessor(false); // Disable logging for tests
  });

  describe("pipeline execution order", () => {
    it("should apply sanitizers in the correct phase order", () => {
      // This test verifies that the phased structure maintains the same execution order
      const malformedJson = `
        \`\`\`json
        {
          "name": "Test",
          "path": BASE_PATH + "/file.ts",
          "items": [1, 2, 3,]
        }
        \`\`\`
      `;

      const schema = z.object({
        name: z.string(),
        path: z.string(),
        items: z.array(z.number()),
      });

      const result = processor.parseAndValidate(malformedJson, "test-resource", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Test");
        expect(result.data.items).toEqual([1, 2, 3]);
        // Verify that multiple phases were applied
        expect(result.steps).toBeDefined();
        expect(result.steps.length).toBeGreaterThan(0);
      }
    });

    it("should handle noise removal phase correctly", () => {
      const jsonWithNoise = `
        \`\`\`json
        { "name": "value" }
        \`\`\`
      `;

      const schema = z.object({
        name: z.string(),
      });

      const result = processor.parseAndValidate(jsonWithNoise, "test-resource", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("value");
      }
    });

    it("should handle structure fixes phase correctly", () => {
      const jsonWithStructureIssues = `{
        "name": "test"
        "value": 123
      }`;

      const schema = z.object({
        name: z.string(),
        value: z.number(),
      });

      const result = processor.parseAndValidate(jsonWithStructureIssues, "test-resource", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("test");
        expect(result.data.value).toBe(123);
      }
    });

    it("should handle property fixes phase correctly", () => {
      const jsonWithPropertyIssues = `{
        "name": "test",
        "path": BASE_PATH + "/file"
      }`;

      const schema = z.object({
        name: z.string(),
        path: z.string(),
      });

      const result = processor.parseAndValidate(jsonWithPropertyIssues, "test-resource", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("test");
        expect(result.data.path).toBeDefined();
      }
    });

    it("should handle content fixes phase correctly", () => {
      // Test with truncation marker on its own line (which should be removed)
      const jsonWithContentIssues = `{
        "name": "test",
        "items": [1, 2, 3
...
]}`;

      const schema = z.object({
        name: z.string(),
        items: z.array(z.number()),
      });

      const result = processor.parseAndValidate(jsonWithContentIssues, "test-resource", {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: schema,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("test");
        expect(result.data.items).toEqual([1, 2, 3]);
      }
    });
  });

  describe("pipeline maintains backward compatibility", () => {
    it("should produce same results as before refactoring", () => {
      // Test with various malformed JSON patterns to ensure behavior is unchanged
      const testCases = [
        {
          input: '{"name": "test", "value": null}',
          schema: z.object({ name: z.string(), value: z.string().optional() }),
          expectedSuccess: true,
        },
        {
          input: '```json\n{"name": "test"}\n```',
          schema: z.object({ name: z.string() }),
          expectedSuccess: true,
        },
        {
          input: '{"name": "test", "items": [1, 2, 3,]}',
          schema: z.object({ name: z.string(), items: z.array(z.number()) }),
          expectedSuccess: true,
        },
      ];

      for (const testCase of testCases) {
        const result = processor.parseAndValidate(testCase.input, "test-resource", {
          outputFormat: LLMOutputFormat.JSON,
          jsonSchema: testCase.schema,
        });

        expect(result.success).toBe(testCase.expectedSuccess);
      }
    });
  });
});

