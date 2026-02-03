import { parseAndValidateLLMJson } from "../../../../src/common/llm/json-processing/core/json-processing";
import {
  LLMCompletionOptions,
  LLMOutputFormat,
  LLMPurpose,
} from "../../../../src/common/llm/types/llm-request.types";
import { JsonProcessingErrorType } from "../../../../src/common/llm/json-processing/types/json-processing.errors";
import { z } from "zod";

/**
 * Tests for the schema fixing transformation pipeline.
 * These tests verify that transformations are applied after JSON.parse
 * when initial validation fails, to normalize and correct parsed data.
 */
describe("Schema Fixing Transforms", () => {
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

      // Schema expects unwrapped structure (will fail validation initially, triggering transform)
      const schema = z.object({
        name: z.string(),
        version: z.string(),
      });

      const result = (parseAndValidateLLMJson as any)(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        { ...defaultOptions, jsonSchema: schema },
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

      const result = (parseAndValidateLLMJson as any)(
        normalJson,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        defaultOptions,
      );

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

      const schema = z.object({
        config: z.object({
          apiKey: z.string(),
          timeout: z.number(),
        }),
        enabled: z.boolean(),
      });

      const result = (parseAndValidateLLMJson as any)(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        { ...defaultOptions, jsonSchema: schema },
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

      const result = (parseAndValidateLLMJson as any)(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        defaultOptions,
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

      const result = (parseAndValidateLLMJson as any)(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        defaultOptions,
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

      const result = (parseAndValidateLLMJson as any)(
        invalidJson,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        defaultOptions,
      );

      // Should fail to parse, transforms should not run
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe(JsonProcessingErrorType.PARSE);
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

      const schema = z.object({
        validField: z.string(),
      });

      const result = (parseAndValidateLLMJson as any)(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        { ...defaultOptions, jsonSchema: schema },
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

      const schema = z.object({
        projectName: z.string(),
        dependencies: z.array(z.string()),
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        { ...defaultOptions, jsonSchema: schema },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          projectName: "MyApp",
          dependencies: ["react", "typescript"],
        });
        // Should have applied sanitization steps
        expect(result.repairs.length).toBeGreaterThan(0);
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

      const schema = z.object({
        database: z.object({
          host: z.string(),
          port: z.number(),
          credentials: z.object({
            username: z.string(),
            password: z.string(),
          }),
        }),
      });

      const result = (parseAndValidateLLMJson as any)(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        { ...defaultOptions, jsonSchema: schema },
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

  describe("fixParameterPropertyNameTypos transform", () => {
    it("fixes type_ to type in parameter objects (exact error from log)", () => {
      // This is the exact error from the log: parameter with type_ instead of type
      const response = JSON.stringify({
        name: "SavingsAccountHelper",
        kind: "CLASS",
        publicFunctions: [
          {
            name: "addChargesForSavings",
            parameters: [
              {
                name: "savingsId",
                type: "Integer",
              },
              {
                name: "chargeId",
                type_: "Integer", // Typo: type_ instead of type
              },
              {
                name: "addDueDate",
                type: "boolean",
              },
            ],
            returnType: "HashMap",
          },
        ],
      });

      // Schema expects type, not type_ (will fail validation initially, triggering transform)
      const schema = z.object({
        name: z.string(),
        kind: z.string(),
        publicFunctions: z.array(
          z.object({
            name: z.string(),
            parameters: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
              }),
            ),
            returnType: z.string(),
          }),
        ),
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        { ...defaultOptions, jsonSchema: schema },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const methods = result.data.publicFunctions as Record<string, unknown>[];
        const method = methods[0];
        const parameters = method.parameters as Record<string, unknown>[];
        const param = parameters[1];
        expect(param.type).toBe("Integer");
        expect(param.type_).toBeUndefined();
      }
    });

    it("fixes type_ to type in nested parameter objects", () => {
      const response = JSON.stringify({
        publicFunctions: [
          {
            name: "testMethod",
            parameters: [
              {
                name: "param1",
                type: "String",
              },
              {
                name: "param2",
                type_: "Integer",
              },
            ],
          },
        ],
      });

      const schema = z.object({
        publicFunctions: z.array(
          z.object({
            name: z.string(),
            parameters: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
              }),
            ),
          }),
        ),
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        { ...defaultOptions, jsonSchema: schema },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const methods = result.data.publicFunctions as Record<string, unknown>[];
        const method = methods[0];
        const parameters = method.parameters as Record<string, unknown>[];
        expect(parameters[0].type).toBe("String");
        expect(parameters[1].type).toBe("Integer");
        expect(parameters[1].type_).toBeUndefined();
      }
    });

    it("fixes name_ to name in parameter objects", () => {
      const response = JSON.stringify({
        publicFunctions: [
          {
            name: "testMethod",
            parameters: [
              {
                name_: "param1", // Typo: name_ instead of name
                type: "String",
              },
            ],
          },
        ],
      });

      const schema = z.object({
        publicFunctions: z.array(
          z.object({
            name: z.string(),
            parameters: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
              }),
            ),
          }),
        ),
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        { ...defaultOptions, jsonSchema: schema },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const methods = result.data.publicFunctions as Record<string, unknown>[];
        const method = methods[0];
        const parameters = method.parameters as Record<string, unknown>[];
        expect(parameters[0].name).toBe("param1");
        expect(parameters[0].name_).toBeUndefined();
      }
    });

    it("does not fix type_ if type already exists", () => {
      // If both type_ and type exist, keep both (don't overwrite)
      const response = JSON.stringify({
        parameters: [
          {
            name: "param1",
            type: "String",
            type_: "Integer", // Both exist
          },
        ],
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const parameters = result.data.parameters as Record<string, unknown>[];
        expect(parameters[0].type).toBe("String");
        expect(parameters[0].type_).toBe("Integer");
      }
    });

    it("fixes type_ recursively in nested structures", () => {
      const response = JSON.stringify({
        nested: {
          deeper: {
            parameters: [
              {
                name: "param1",
                type_: "String",
              },
            ],
          },
        },
      });

      const schema = z.object({
        nested: z.object({
          deeper: z.object({
            parameters: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
              }),
            ),
          }),
        }),
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        { ...defaultOptions, jsonSchema: schema },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const nested = result.data.nested as Record<string, unknown>;
        const deeper = nested.deeper as Record<string, unknown>;
        const parameters = deeper.parameters as Record<string, unknown>[];
        expect(parameters[0].type).toBe("String");
        expect(parameters[0].type_).toBeUndefined();
      }
    });

    it("handles arrays of parameter objects", () => {
      const response = JSON.stringify({
        methods: [
          {
            parameters: [
              {
                name: "p1",
                type_: "String",
              },
              {
                name: "p2",
                type_: "Integer",
              },
            ],
          },
          {
            parameters: [
              {
                name: "p3",
                type_: "Boolean",
              },
            ],
          },
        ],
      });

      const schema = z.object({
        methods: z.array(
          z.object({
            parameters: z.array(
              z.object({
                name: z.string(),
                type: z.string(),
              }),
            ),
          }),
        ),
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        { ...defaultOptions, jsonSchema: schema },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const methods = result.data.methods as Record<string, unknown>[];
        const params1 = methods[0].parameters as Record<string, unknown>[];
        const params2 = methods[1].parameters as Record<string, unknown>[];
        expect(params1[0].type).toBe("String");
        expect(params1[1].type).toBe("Integer");
        expect(params2[0].type).toBe("Boolean");
      }
    });

    it("leaves valid JSON unchanged", () => {
      const response = JSON.stringify({
        parameters: [
          {
            name: "param1",
            type: "String",
          },
        ],
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const parameters = result.data.parameters as Record<string, unknown>[];
        expect(parameters[0].type).toBe("String");
        expect(parameters[0].name).toBe("param1");
      }
    });

    it("handles empty objects and arrays", () => {
      const response = JSON.stringify({
        parameters: [],
        empty: {},
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(Array.isArray(result.data.parameters)).toBe(true);
        expect((result.data.parameters as unknown[]).length).toBe(0);
      }
    });

    it("handles primitives without modification", () => {
      const response = JSON.stringify({
        string: "test",
        number: 42,
        boolean: true,
        nullValue: null,
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.string).toBe("test");
        expect(result.data.number).toBe(42);
        expect(result.data.boolean).toBe(true);
      }
    });
  });

  describe("fixParametersFieldType transform", () => {
    it("should convert string parameters field to empty array", () => {
      const response = JSON.stringify({
        name: "TestClass",
        publicFunctions: [
          {
            name: "basicLoanDetails",
            parameters:
              "59 parameters including id, accountNo, status, externalId, clientId, clientAccountNo, etc.",
            returnType: "LoanAccountData",
          },
          {
            name: "associationsAndTemplate",
            parameters:
              "30 parameters including acc, repaymentSchedule, transactions, charges, collateral, guarantors, etc.",
            returnType: "LoanAccountData",
          },
        ],
      });

      // Schema expects parameters to be array, not string (will fail validation initially, triggering transform)
      const schema = z.object({
        name: z.string(),
        publicFunctions: z.array(
          z.object({
            name: z.string(),
            parameters: z.array(z.unknown()),
            returnType: z.string(),
          }),
        ),
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        { ...defaultOptions, jsonSchema: schema },
        true,
        { arrayPropertyNames: ["parameters"] },
      );

      if (!result.success) {
        console.log("Result error:", result.error);
      }
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(Array.isArray(data.publicFunctions[0].parameters)).toBe(true);
        expect(data.publicFunctions[0].parameters).toEqual([]);
        expect(Array.isArray(data.publicFunctions[1].parameters)).toBe(true);
        expect(data.publicFunctions[1].parameters).toEqual([]);
      }
    });

    it("should leave array parameters unchanged", () => {
      const response = JSON.stringify({
        name: "TestClass",
        publicFunctions: [
          {
            name: "testMethod",
            parameters: [
              { name: "param1", type: "String" },
              { name: "param2", type: "Number" },
            ],
            returnType: "void",
          },
        ],
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect(Array.isArray(data.publicFunctions[0].parameters)).toBe(true);
        expect(data.publicFunctions[0].parameters).toHaveLength(2);
        expect(data.publicFunctions[0].parameters[0].name).toBe("param1");
      }
    });

    it("should handle methods without parameters field", () => {
      const response = JSON.stringify({
        name: "TestClass",
        publicFunctions: [
          {
            name: "testMethod",
            returnType: "void",
          },
        ],
      });

      const result = (parseAndValidateLLMJson as any)(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS, modelKey: "test-model" },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data;
        expect("parameters" in data.publicFunctions[0]).toBe(false);
      }
    });
  });
});
