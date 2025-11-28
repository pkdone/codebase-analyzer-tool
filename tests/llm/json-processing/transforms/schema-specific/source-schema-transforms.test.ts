import {
  normalizeDatabaseIntegrationArray,
  fixParameterPropertyNameTypos,
  fixMissingRequiredFields,
  fixParametersFieldType,
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

  describe("fixParameterPropertyNameTypos", () => {
    it("should fix type_ to type", () => {
      const input = {
        publicMethods: [
          {
            name: "testMethod",
            type_: "string",
            description: "Test method",
          },
        ],
      };

      const result = fixParameterPropertyNameTypos(input);

      expect(result).toEqual({
        publicMethods: [
          {
            name: "testMethod",
            type: "string",
            description: "Test method",
          },
        ],
      });
    });

    it("should fix name_ to name", () => {
      const input = {
        parameters: [
          {
            name_: "param1",
            type: "string",
          },
        ],
      };

      const result = fixParameterPropertyNameTypos(input);

      expect(result).toEqual({
        parameters: [
          {
            name: "param1",
            type: "string",
          },
        ],
      });
    });

    it("should not fix type_ if type already exists", () => {
      const input = {
        parameter: {
          type: "correct",
          type_: "wrong",
        },
      };

      const result = fixParameterPropertyNameTypos(input);

      expect(result).toEqual({
        parameter: {
          type: "correct",
          type_: "wrong",
        },
      });
    });

    it("should recursively process nested objects", () => {
      const input = {
        level1: {
          level2: {
            type_: "nested",
          },
        },
      };

      const result = fixParameterPropertyNameTypos(input);

      expect(result).toEqual({
        level1: {
          level2: {
            type: "nested",
          },
        },
      });
    });

    it("should process arrays recursively", () => {
      const input = [{ type_: "first" }, { type_: "second" }, { nested: { type_: "third" } }];

      const result = fixParameterPropertyNameTypos(input);

      expect(result).toEqual([
        { type: "first" },
        { type: "second" },
        { nested: { type: "third" } },
      ]);
    });

    it("should handle null and primitives", () => {
      expect(fixParameterPropertyNameTypos(null)).toBeNull();
      expect(fixParameterPropertyNameTypos("string")).toBe("string");
      expect(fixParameterPropertyNameTypos(123)).toBe(123);
      expect(fixParameterPropertyNameTypos(true)).toBe(true);
    });

    it("should leave objects without typos unchanged", () => {
      const input = {
        name: "correct",
        type: "correct",
        value: 123,
      };

      const result = fixParameterPropertyNameTypos(input);

      expect(result).toEqual(input);
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

  describe("fixParametersFieldType", () => {
    it("should convert string parameters field to empty array", () => {
      const input = {
        name: "TestClass",
        publicMethods: [
          {
            name: "basicLoanDetails",
            parameters:
              "59 parameters including id, accountNo, status, externalId, clientId, clientAccountNo, etc.",
            returnType: "LoanAccountData",
          },
        ],
      };

      const result = fixParametersFieldType(input);

      expect(Array.isArray((result as any).publicMethods[0].parameters)).toBe(true);
      expect((result as any).publicMethods[0].parameters).toEqual([]);
    });

    it("should leave array parameters unchanged", () => {
      const input = {
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
      };

      const result = fixParametersFieldType(input);

      expect(Array.isArray((result as any).publicMethods[0].parameters)).toBe(true);
      expect((result as any).publicMethods[0].parameters).toHaveLength(2);
      expect((result as any).publicMethods[0].parameters[0].name).toBe("param1");
    });

    it("should handle methods without parameters field", () => {
      const input = {
        name: "TestClass",
        publicMethods: [
          {
            name: "testMethod",
            returnType: "void",
          },
        ],
      };

      const result = fixParametersFieldType(input);

      expect("parameters" in (result as any).publicMethods[0]).toBe(false);
    });
  });
});
