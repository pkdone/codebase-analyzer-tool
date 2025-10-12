import { JsonProcessor } from "../../../src/llm/json-processing/core/json-processor";
import { LLMCompletionOptions, LLMOutputFormat } from "../../../src/llm/types/llm.types";

/**
 * Tests for the JsonProcessor's post-parse transformation pipeline.
 * These tests verify that transformations are applied after JSON.parse
 * but before schema validation.
 */
describe("JsonProcessor - Post-Parse Transforms", () => {
  let processor: JsonProcessor;

  beforeEach(() => {
    processor = new JsonProcessor();
  });

  const defaultOptions: LLMCompletionOptions = {
    outputFormat: LLMOutputFormat.JSON,
  };

  describe("unwrapJsonSchemaStructure transform", () => {
    it("unwraps JSON Schema structure when LLM returns schema instead of data", () => {
      // LLM returns a JSON Schema structure instead of data
      const schemaResponse = JSON.stringify({
        type: "object",
        properties: {
          name: "TestProject",
          version: "1.0.0",
        },
      });

      const result = processor.parseAndValidate(
        schemaResponse,
        "TestResource",
        defaultOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          name: "TestProject",
          version: "1.0.0",
        });
      }
    });

    it("leaves normal JSON untransformed", () => {
      const normalJson = JSON.stringify({
        name: "TestProject",
        version: "1.0.0",
      });

      const result = processor.parseAndValidate(normalJson, "TestResource", defaultOptions, false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          name: "TestProject",
          version: "1.0.0",
        });
      }
    });

    it("handles nested objects in schema properties", () => {
      const schemaResponse = JSON.stringify({
        type: "object",
        properties: {
          config: {
            apiKey: "secret123",
            timeout: 5000,
          },
          enabled: true,
        },
      });

      const result = processor.parseAndValidate(
        schemaResponse,
        "TestResource",
        defaultOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          config: {
            apiKey: "secret123",
            timeout: 5000,
          },
          enabled: true,
        });
      }
    });

    it("does not unwrap if properties is empty", () => {
      const schemaResponse = JSON.stringify({
        type: "object",
        properties: {},
      });

      const result = processor.parseAndValidate(
        schemaResponse,
        "TestResource",
        defaultOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Should remain as-is since properties is empty
        expect(result.data).toEqual({
          type: "object",
          properties: {},
        });
      }
    });

    it("does not unwrap if type is not 'object'", () => {
      const schemaResponse = JSON.stringify({
        type: "array",
        properties: {
          name: "TestProject",
        },
      });

      const result = processor.parseAndValidate(
        schemaResponse,
        "TestResource",
        defaultOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        // Should remain as-is since type is not "object"
        expect(result.data).toEqual({
          type: "array",
          properties: {
            name: "TestProject",
          },
        });
      }
    });
  });

  describe("Transform execution order", () => {
    it("applies transforms only after successful parse", () => {
      const invalidJson = "{ this is not valid json";

      const result = processor.parseAndValidate(invalidJson, "TestResource", defaultOptions, false);

      // Should fail to parse, transforms should not run
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.originalContent).toBe(invalidJson);
      }
    });

    it("applies transforms before validation", () => {
      // This test verifies the order: parse -> transform -> validate
      const schemaResponse = JSON.stringify({
        type: "object",
        properties: {
          validField: "value",
        },
      });

      const result = processor.parseAndValidate(
        schemaResponse,
        "TestResource",
        defaultOptions,
        false,
      );

      // The transform should unwrap it first, then validate
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          validField: "value",
        });
      }
    });
  });

  describe("Complex real-world scenarios", () => {
    it("handles LLM response with schema wrapper and sanitization needed", () => {
      // LLM returns schema wrapped in code fences
      const response = `\`\`\`json
{
  "type": "object",
  "properties": {
    "projectName": "MyApp",
    "dependencies": ["react", "typescript"]
  }
}
\`\`\``;

      const result = processor.parseAndValidate(response, "TestResource", defaultOptions, false);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          projectName: "MyApp",
          dependencies: ["react", "typescript"],
        });
        // Should have applied sanitization steps
        expect(result.steps.length).toBeGreaterThan(0);
      }
    });

    it("handles multiple levels of nesting in schema properties", () => {
      const schemaResponse = JSON.stringify({
        type: "object",
        properties: {
          database: {
            host: "localhost",
            port: 5432,
            credentials: {
              username: "admin",
              password: "secret",
            },
          },
        },
      });

      const result = processor.parseAndValidate(
        schemaResponse,
        "TestResource",
        defaultOptions,
        false,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          database: {
            host: "localhost",
            port: 5432,
            credentials: {
              username: "admin",
              password: "secret",
            },
          },
        });
      }
    });
  });
});
