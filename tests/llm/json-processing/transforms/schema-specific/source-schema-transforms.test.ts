import {
  normalizeDatabaseIntegrationArray,
  fixMissingRequiredFields,
} from "../../../../../src/llm/json-processing/transforms/schema-specific/source-schema-transforms.js";

describe("source-schema-transforms", () => {
  describe("normalizeDatabaseIntegrationArray", () => {
    it("should convert single-element array to object", () => {
      const input = {
        purpose: "Test purpose",
        databaseIntegration: [
          {
            mechanism: "SQL",
            description: "Test description",
            codeExample: "SELECT * FROM table",
          },
        ],
      };

      const result = normalizeDatabaseIntegrationArray(input);

      expect(result).toEqual({
        purpose: "Test purpose",
        databaseIntegration: {
          mechanism: "SQL",
          description: "Test description",
          codeExample: "SELECT * FROM table",
        },
      });
    });

    it("should merge multiple database integration objects", () => {
      const input = {
        purpose: "Test purpose",
        databaseIntegration: [
          {
            mechanism: "SQL",
            description: "First description",
            codeExample: "SELECT * FROM table1",
            tablesAccessed: ["table1"],
            operationType: ["READ"],
          },
          {
            mechanism: "SQL",
            description: "Second description",
            codeExample: "INSERT INTO table2",
            tablesAccessed: ["table2"],
            operationType: ["WRITE"],
          },
        ],
      };

      const result = normalizeDatabaseIntegrationArray(input);

      expect(result).toHaveProperty("databaseIntegration");
      const dbIntegration = (result as any).databaseIntegration;
      expect(dbIntegration.mechanism).toBe("SQL");
      expect(dbIntegration.description).toContain("First description");
      expect(dbIntegration.tablesAccessed).toEqual(expect.arrayContaining(["table1", "table2"]));
      expect(dbIntegration.operationType).toEqual(expect.arrayContaining(["READ", "WRITE"]));
    });

    it("should remove databaseIntegration when array is empty", () => {
      const input = {
        purpose: "Test purpose",
        databaseIntegration: [],
      };

      const result = normalizeDatabaseIntegrationArray(input);

      expect(result).not.toHaveProperty("databaseIntegration");
      expect(result).toEqual({ purpose: "Test purpose" });
    });

    it("should leave non-array databaseIntegration unchanged", () => {
      const input = {
        purpose: "Test purpose",
        databaseIntegration: {
          mechanism: "SQL",
          description: "Test description",
        },
      };

      const result = normalizeDatabaseIntegrationArray(input);

      expect(result).toEqual(input);
    });

    it("should handle objects without databaseIntegration", () => {
      const input = {
        purpose: "Test purpose",
        implementation: "Test implementation",
      };

      const result = normalizeDatabaseIntegrationArray(input);

      expect(result).toEqual(input);
    });

    it("should handle null and arrays", () => {
      expect(normalizeDatabaseIntegrationArray(null)).toBeNull();
      expect(normalizeDatabaseIntegrationArray([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe("fixMissingRequiredFields", () => {
    it("should add missing returnType field to publicMethods", () => {
      const input = {
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
        ],
      };

      const result = fixMissingRequiredFields(input);

      expect((result as any).publicMethods[0].returnType).toBe("void");
      expect((result as any).publicMethods[1].returnType).toBe("string");
    });

    it("should add missing description field to publicMethods", () => {
      const input = {
        name: "TestClass",
        publicMethods: [
          {
            name: "testMethod1",
            parameters: [],
            returnType: "void",
            // description is missing
          },
        ],
      };

      const result = fixMissingRequiredFields(input);

      expect((result as any).publicMethods[0].description).toBe("");
    });

    it("should handle nested structures correctly", () => {
      const input = {
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
      };

      const result = fixMissingRequiredFields(input);

      expect((result as any).nested.publicMethods[0].returnType).toBe("void");
    });
  });
});
