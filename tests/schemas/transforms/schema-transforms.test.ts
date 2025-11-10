import {
  normalizeDatabaseIntegrationArray,
  fixParameterPropertyNameTypos,
} from "../../../src/schemas/transforms/schema-transforms";

describe("schema-transforms", () => {
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
});
