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

      const result = processor.parseAndValidate(schemaResponse, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(normalJson, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(schemaResponse, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(schemaResponse, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(schemaResponse, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(invalidJson, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(schemaResponse, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(response, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(schemaResponse, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(response, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(response, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(response, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(response, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(response, "TestResource", defaultOptions);

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

      const result = processor.parseAndValidate(response, "TestResource", defaultOptions);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.databaseIntegration).toBeDefined();
        expect(Array.isArray(result.data.databaseIntegration)).toBe(false);
        const dbIntegration = result.data.databaseIntegration as Record<string, unknown>;
        expect(dbIntegration.mechanism).toBe("STORED-PROCEDURE");
        expect(Array.isArray(dbIntegration.tablesAccessed)).toBe(true);
        expect(dbIntegration.tablesAccessed).toContain("dual");
        expect(Array.isArray(dbIntegration.operationType)).toBe(true);
        expect(dbIntegration.operationType).toEqual(
          expect.arrayContaining(["READ", "DDL"]),
        );
      }
    });
  });
});
