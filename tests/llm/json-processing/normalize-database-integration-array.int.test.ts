import { JsonProcessor } from "../../../src/llm/json-processing/core/json-processor";
import { LLMOutputFormat, LLMPurpose } from "../../../src/llm/types/llm.types";
import { sourceSummarySchema } from "../../../src/schemas/sources.schema";

/**
 * Integration tests for the normalizeDatabaseIntegrationArray transform
 * using the actual sourceSummarySchema to ensure the fix works with real validation.
 */
describe("normalizeDatabaseIntegrationArray - Integration with sourceSummarySchema", () => {
  let processor: JsonProcessor;

  beforeEach(() => {
    processor = new JsonProcessor(false); // Disable logging for tests
  });

  it("should fix validation error when databaseIntegration is returned as array", () => {
    // This is the actual error scenario from the log file
    const llmResponse = JSON.stringify({
      purpose:
        "This PL/SQL script serves as a technical demonstration to illustrate the performance impact of the PL/SQL compiler's optimization settings.",
      implementation:
        "The script's implementation centers around a stored procedure named `test_cursor_performance`. This procedure is designed to fetch 100,000 records generated from the `dual` table and process them using one of three methods specified by an input parameter: an implicit cursor FOR loop, an explicit OPEN-FETCH-CLOSE loop, or a BULK COLLECT with a limit.",
      tables: [],
      storedProcedures: [
        {
          name: "test_cursor_performance",
          purpose:
            "This procedure benchmarks the performance of three different cursor processing strategies: an implicit FOR loop, an explicit OPEN-FETCH-CLOSE loop, and a BULK COLLECT fetch.",
          complexity: "MEDIUM",
          complexityReason:
            "The procedure contains multiple control flow paths via a CASE statement, implements three distinct data fetching algorithms, and includes a nested procedure for timing.",
          linesOfCode: 87,
        },
      ],
      triggers: [],
      databaseIntegration: [
        {
          mechanism: "STORED-PROCEDURE",
          description:
            "The script defines and executes a PL/SQL stored procedure to benchmark cursor performance. This involves creating the procedure with DDL, querying the 'dual' table within the procedure, and then altering the procedure's compilation settings using DDL commands.",
          codeExample:
            "CREATE OR REPLACE PROCEDURE test_cursor_performance (approach IN VARCHAR2) \nIS \n   CURSOR cur \n   IS \n      SELECT * \n        FROM dual",
          databaseName: null,
          tablesAccessed: ["dual"],
          operationType: ["READ", "DDL"],
          queryPatterns:
            "stored procedure definition and execution, cursor loops, DDL for compilation settings",
          transactionHandling:
            "auto-commit (for DDL) and no explicit transaction management for read operations",
          protocol: "Oracle PL/SQL",
          connectionInfo: "not applicable for SQL files",
        },
        {
          mechanism: "DDL",
          description:
            "The script uses DDL statements to create and alter a stored procedure. Specifically, it uses `CREATE OR REPLACE PROCEDURE` to define the procedure and `ALTER PROCEDURE ... COMPILE` to change the PL/SQL optimization level for testing purposes.",
          codeExample: "ALTER PROCEDURE test_cursor_performance COMPILE plsql_optimize_level=0;",
          databaseName: null,
          tablesAccessed: [],
          operationType: ["DDL"],
          queryPatterns: "ALTER PROCEDURE statements",
          transactionHandling: "DDL statements cause an implicit commit.",
          protocol: "Oracle PL/SQL",
          connectionInfo: "not applicable for SQL files",
        },
        {
          mechanism: "SQL",
          description:
            "The script uses anonymous PL/SQL blocks to execute the `test_cursor_performance` stored procedure multiple times with different parameters. These blocks also use `DBMS_OUTPUT.put_line` to print informational messages to the console.",
          codeExample:
            "BEGIN \n   DBMS_OUTPUT.put_line ('No optimization...'); \n \n   test_cursor_performance ('implicit cursor for loop'); \n \n   test_cursor_performance ('explicit open, fetch, close'); \n \n   test_cursor_performance ('bulk fetch'); \nEND;",
          databaseName: null,
          tablesAccessed: [],
          operationType: ["READ"],
          queryPatterns: "anonymous PL/SQL blocks, stored procedure calls",
          transactionHandling: "none",
          protocol: "Oracle PL/SQL",
          connectionInfo: "not applicable for SQL files",
        },
      ],
    });

    const completionOptions = {
      outputFormat: LLMOutputFormat.JSON,
      jsonSchema: sourceSummarySchema,
    };

    // Before the fix, this would fail with: "Expected object, received array" at path ["databaseIntegration"]
    // After the fix, this should succeed
    const result = processor.parseAndValidate(
      llmResponse,
      { resource: "dbstuff/cursor-for-loop-optimization.sql", purpose: LLMPurpose.COMPLETIONS },
      completionOptions,
    );

    expect(result.success).toBe(true);
    if (result.success) {
      // Verify the structure is correct
      expect(result.data.purpose).toBeDefined();
      expect(result.data.implementation).toBeDefined();
      expect(result.data.storedProcedures).toBeDefined();
      expect(Array.isArray(result.data.storedProcedures)).toBe(true);

      // Verify databaseIntegration is now a single object, not an array
      expect(result.data.databaseIntegration).toBeDefined();
      expect(Array.isArray(result.data.databaseIntegration)).toBe(false);

      const dbIntegration = result.data.databaseIntegration as Record<string, unknown>;
      // Should have mechanism from first element
      expect(dbIntegration.mechanism).toBe("STORED-PROCEDURE");
      // Should have merged tablesAccessed
      expect(Array.isArray(dbIntegration.tablesAccessed)).toBe(true);
      expect(dbIntegration.tablesAccessed).toContain("dual");
      // Should have merged operationType
      expect(Array.isArray(dbIntegration.operationType)).toBe(true);
      expect(dbIntegration.operationType).toEqual(expect.arrayContaining(["READ", "DDL"]));
      // Should have merged description
      expect(typeof dbIntegration.description).toBe("string");
      expect(dbIntegration.description).toContain("stored procedure");
      // Should have merged codeExample
      expect(typeof dbIntegration.codeExample).toBe("string");
      expect(dbIntegration.codeExample).toContain("CREATE OR REPLACE PROCEDURE");

      // Verify the result passes schema validation
      const schemaValidation = sourceSummarySchema.safeParse(result.data);
      expect(schemaValidation.success).toBe(true);
    }
  });

  it("should handle single-element array", () => {
    const llmResponse = JSON.stringify({
      purpose: "Test SQL file",
      implementation: "Contains a single stored procedure",
      databaseIntegration: [
        {
          mechanism: "STORED-PROCEDURE",
          description: "Contains a stored procedure",
          codeExample: "CREATE PROCEDURE test()",
        },
      ],
    });

    const result = processor.parseAndValidate(
      llmResponse,
      { resource: "test.sql", purpose: LLMPurpose.COMPLETIONS },
      {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: sourceSummarySchema,
      },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.databaseIntegration).toBeDefined();
      expect(Array.isArray(result.data.databaseIntegration)).toBe(false);
      const dbIntegration = result.data.databaseIntegration as Record<string, unknown>;
      expect(dbIntegration.mechanism).toBe("STORED-PROCEDURE");
    }
  });

  it("should handle missing databaseIntegration field", () => {
    const llmResponse = JSON.stringify({
      purpose: "Test file without database integration",
      implementation: "No database code here",
    });

    const result = processor.parseAndValidate(
      llmResponse,
      { resource: "test.ts", purpose: LLMPurpose.COMPLETIONS },
      {
        outputFormat: LLMOutputFormat.JSON,
        jsonSchema: sourceSummarySchema,
      },
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.databaseIntegration).toBeUndefined();
    }
  });
});
