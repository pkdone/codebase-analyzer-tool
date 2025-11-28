import { processJson } from "../../../src/llm/json-processing/core/json-processing";
import {
  LLMCompletionOptions,
  LLMOutputFormat,
  LLMPurpose,
} from "../../../src/llm/types/llm.types";
import { JsonProcessingErrorType } from "../../../src/llm/json-processing/types/json-processing.errors";

/**
 * Tests for the post-parse transformation pipeline.
 * These tests verify that transformations are applied after JSON.parse
 * but before schema validation.
 */
describe("Post-Parse Transforms", () => {
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

      const result = processJson(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
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

    it("leaves normal JSON untransformed", () => {
      const normalJson = JSON.stringify({
        name: "TestProject",
        version: "1.0.0",
      });

      const result = processJson(
        normalJson,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
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

      const result = processJson(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
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

      const result = processJson(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
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

      const result = processJson(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
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

      const result = processJson(
        invalidJson,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
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

      const result = processJson(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

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

      const result = processJson(
        schemaResponse,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
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

  describe("normalizeDatabaseIntegrationArray transform", () => {
    it("converts single-element array to object", () => {
      const response = JSON.stringify({
        purpose: "Test file",
        databaseIntegration: [
          {
            mechanism: "STORED-PROCEDURE",
            description: "Uses stored procedures",
            codeExample: "CREATE PROCEDURE test()",
          },
        ],
      });

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          purpose: "Test file",
          databaseIntegration: {
            mechanism: "STORED-PROCEDURE",
            description: "Uses stored procedures",
            codeExample: "CREATE PROCEDURE test()",
          },
        });
      }
    });

    it("converts empty array to undefined", () => {
      const response = JSON.stringify({
        purpose: "Test file",
        databaseIntegration: [],
      });

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          purpose: "Test file",
        });
        expect(result.data.databaseIntegration).toBeUndefined();
      }
    });

    it("merges multiple database integration objects intelligently", () => {
      const response = JSON.stringify({
        purpose: "SQL script with multiple mechanisms",
        databaseIntegration: [
          {
            mechanism: "STORED-PROCEDURE",
            description: "Defines stored procedures",
            codeExample: "CREATE PROCEDURE test()",
            tablesAccessed: ["users"],
            operationType: ["READ"],
            protocol: "Oracle PL/SQL",
          },
          {
            mechanism: "DDL",
            description: "Uses DDL statements",
            codeExample: "ALTER PROCEDURE test COMPILE",
            tablesAccessed: ["dual"],
            operationType: ["DDL"],
            protocol: "Oracle PL/SQL",
          },
        ],
      });

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.databaseIntegration).toBeDefined();
        const dbIntegration = result.data.databaseIntegration as Record<string, unknown>;
        // Should use first mechanism
        expect(dbIntegration.mechanism).toBe("STORED-PROCEDURE");
        // Should merge descriptions
        expect(dbIntegration.description).toContain("Defines stored procedures");
        expect(dbIntegration.description).toContain("Uses DDL statements");
        // Should merge tablesAccessed arrays
        expect(dbIntegration.tablesAccessed).toEqual(expect.arrayContaining(["users", "dual"]));
        // Should merge operationType arrays
        expect(dbIntegration.operationType).toEqual(expect.arrayContaining(["READ", "DDL"]));
        // Should preserve other fields from first object
        expect(dbIntegration.protocol).toBe("Oracle PL/SQL");
        // Should merge codeExamples
        expect(dbIntegration.codeExample).toContain("CREATE PROCEDURE");
        expect(dbIntegration.codeExample).toContain("ALTER PROCEDURE");
      }
    });

    it("handles objects without databaseIntegration field", () => {
      const response = JSON.stringify({
        purpose: "Test file",
        implementation: "Some code",
      });

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          purpose: "Test file",
          implementation: "Some code",
        });
      }
    });

    it("leaves non-array databaseIntegration unchanged", () => {
      const response = JSON.stringify({
        purpose: "Test file",
        databaseIntegration: {
          mechanism: "SQL",
          description: "Direct SQL queries",
          codeExample: "SELECT * FROM users",
        },
      });

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({
          purpose: "Test file",
          databaseIntegration: {
            mechanism: "SQL",
            description: "Direct SQL queries",
            codeExample: "SELECT * FROM users",
          },
        });
      }
    });

    it("handles the actual error scenario from the log file", () => {
      // This is the actual structure from the error log
      const response = JSON.stringify({
        purpose: "PL/SQL script for cursor optimization",
        implementation: "Demonstrates cursor performance",
        tables: [],
        storedProcedures: [
          {
            name: "test_cursor_performance",
            purpose: "Benchmarks cursor performance",
            complexity: "MEDIUM",
            complexityReason: "Multiple control flow paths",
            linesOfCode: 87,
          },
        ],
        triggers: [],
        databaseIntegration: [
          {
            mechanism: "STORED-PROCEDURE",
            description: "Defines and executes PL/SQL stored procedure",
            codeExample: "CREATE OR REPLACE PROCEDURE test_cursor_performance",
            databaseName: null,
            tablesAccessed: ["dual"],
            operationType: ["READ", "DDL"],
            queryPatterns: "stored procedure definition and execution",
            transactionHandling: "auto-commit",
            protocol: "Oracle PL/SQL",
            connectionInfo: "not applicable for SQL files",
          },
          {
            mechanism: "DDL",
            description: "Uses DDL statements to alter procedure",
            codeExample: "ALTER PROCEDURE test_cursor_performance COMPILE",
            databaseName: null,
            tablesAccessed: [],
            operationType: ["DDL"],
            queryPatterns: "ALTER PROCEDURE statements",
            transactionHandling: "DDL statements cause implicit commit",
            protocol: "Oracle PL/SQL",
            connectionInfo: "not applicable for SQL files",
          },
          {
            mechanism: "SQL",
            description: "Uses anonymous PL/SQL blocks",
            codeExample: "BEGIN\n   test_cursor_performance('implicit');\nEND;",
            databaseName: null,
            tablesAccessed: [],
            operationType: ["READ"],
            queryPatterns: "anonymous PL/SQL blocks",
            transactionHandling: "none",
            protocol: "Oracle PL/SQL",
            connectionInfo: "not applicable for SQL files",
          },
        ],
      });

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.databaseIntegration).toBeDefined();
        expect(Array.isArray(result.data.databaseIntegration)).toBe(false);
        const dbIntegration = result.data.databaseIntegration as Record<string, unknown>;
        expect(dbIntegration.mechanism).toBe("STORED-PROCEDURE");
        expect(Array.isArray(dbIntegration.tablesAccessed)).toBe(true);
        expect(dbIntegration.tablesAccessed).toContain("dual");
        expect(Array.isArray(dbIntegration.operationType)).toBe(true);
        expect(dbIntegration.operationType).toEqual(expect.arrayContaining(["READ", "DDL"]));
      }
    });
  });

  describe("fixParameterPropertyNameTypos transform", () => {
    it("fixes type_ to type in parameter objects (exact error from log)", () => {
      // This is the exact error from the log: parameter with type_ instead of type
      const response = JSON.stringify({
        name: "SavingsAccountHelper",
        kind: "CLASS",
        publicMethods: [
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const methods = result.data.publicMethods as Record<string, unknown>[];
        const method = methods[0];
        const parameters = method.parameters as Record<string, unknown>[];
        const param = parameters[1];
        expect(param.type).toBe("Integer");
        expect(param.type_).toBeUndefined();
      }
    });

    it("fixes type_ to type in nested parameter objects", () => {
      const response = JSON.stringify({
        publicMethods: [
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const methods = result.data.publicMethods as Record<string, unknown>[];
        const method = methods[0];
        const parameters = method.parameters as Record<string, unknown>[];
        expect(parameters[0].type).toBe("String");
        expect(parameters[1].type).toBe("Integer");
        expect(parameters[1].type_).toBeUndefined();
      }
    });

    it("fixes name_ to name in parameter objects", () => {
      const response = JSON.stringify({
        publicMethods: [
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const methods = result.data.publicMethods as Record<string, unknown>[];
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
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

  describe("fixMissingRequiredFields transform", () => {
    it("should add missing returnType field to publicMethods", () => {
      const response = JSON.stringify({
        name: "TestClass",
        publicMethods: [
          {
            name: "testMethod1",
            parameters: [],
            // returnType is missing
          },
          {
            name: "testMethod2",
            parameters: [],
            returnType: "string",
          },
          {
            name: "testMethod3",
            parameters: [],
            returnType: undefined,
          },
        ],
      });

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        expect(data.publicMethods[0].returnType).toBe("void");
        expect(data.publicMethods[1].returnType).toBe("string");
        expect(data.publicMethods[2].returnType).toBe("void");
      }
    });

    it("should not modify methods that already have returnType", () => {
      const response = JSON.stringify({
        name: "TestClass",
        publicMethods: [
          {
            name: "testMethod",
            parameters: [],
            returnType: "number",
          },
        ],
      });

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        expect(data.publicMethods[0].returnType).toBe("number");
      }
    });

    it("should handle nested structures correctly", () => {
      const response = JSON.stringify({
        name: "TestClass",
        nested: {
          publicMethods: [
            {
              name: "nestedMethod",
              parameters: [],
              // returnType is missing
            },
          ],
        },
      });

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as any).nested.publicMethods[0].returnType).toBe("void");
      }
    });

    it("should add missing description field to publicMethods", () => {
      const response = JSON.stringify({
        name: "TestClass",
        publicMethods: [
          {
            name: "testMethod1",
            parameters: [],
            returnType: "void",
            // description is missing
          },
          {
            name: "testMethod2",
            parameters: [],
            returnType: "string",
            description: "Existing description",
          },
          {
            name: "testMethod3",
            parameters: [],
            returnType: "number",
            description: undefined,
          },
        ],
      });

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        expect(data.publicMethods[0].description).toBe("");
        expect(data.publicMethods[1].description).toBe("Existing description");
        expect(data.publicMethods[2].description).toBe("");
      }
    });
  });

  describe("fixParametersFieldType transform", () => {
    it("should convert string parameters field to empty array", () => {
      const response = JSON.stringify({
        name: "TestClass",
        publicMethods: [
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        expect(Array.isArray(data.publicMethods[0].parameters)).toBe(true);
        expect(data.publicMethods[0].parameters).toEqual([]);
        expect(Array.isArray(data.publicMethods[1].parameters)).toBe(true);
        expect(data.publicMethods[1].parameters).toEqual([]);
      }
    });

    it("should leave array parameters unchanged", () => {
      const response = JSON.stringify({
        name: "TestClass",
        publicMethods: [
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

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        expect(Array.isArray(data.publicMethods[0].parameters)).toBe(true);
        expect(data.publicMethods[0].parameters).toHaveLength(2);
        expect(data.publicMethods[0].parameters[0].name).toBe("param1");
      }
    });

    it("should handle methods without parameters field", () => {
      const response = JSON.stringify({
        name: "TestClass",
        publicMethods: [
          {
            name: "testMethod",
            returnType: "void",
          },
        ],
      });

      const result = processJson(
        response,
        { resource: "TestResource", purpose: LLMPurpose.COMPLETIONS },
        defaultOptions,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as any;
        expect("parameters" in data.publicMethods[0]).toBe(false);
      }
    });
  });
});
