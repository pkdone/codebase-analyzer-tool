import { convertNullToEmptyStringForRequiredFields } from "../../../../../src/common/llm/json-processing/transforms/convert-null-to-empty-string";

describe("convertNullToEmptyStringForRequiredFields", () => {
  describe("non-matching objects (should not modify)", () => {
    it("should not modify null values in objects without a name property", () => {
      const input = { field1: "value", field2: null };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.field1).toBe("value");
      expect(result.field2).toBeNull();
    });

    it("should not modify null values when name is not a string", () => {
      const input = { name: 123, fields: null };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.name).toBe(123);
      expect(result.fields).toBeNull();
    });

    it("should not modify non-candidate null fields in named objects", () => {
      const input = { name: "test", unknownField: null };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.name).toBe("test");
      expect(result.unknownField).toBeNull();
    });

    it("should preserve primitive values", () => {
      expect(convertNullToEmptyStringForRequiredFields(null)).toBeNull();
      expect(convertNullToEmptyStringForRequiredFields("test")).toBe("test");
      expect(convertNullToEmptyStringForRequiredFields(42)).toBe(42);
      expect(convertNullToEmptyStringForRequiredFields(true)).toBe(true);
      expect(convertNullToEmptyStringForRequiredFields(undefined)).toBeUndefined();
    });

    it("should preserve arrays without named objects", () => {
      const input = [1, null, "test", { notNamed: null }];
      const result = convertNullToEmptyStringForRequiredFields(input) as unknown[];

      expect(result).toEqual([1, null, "test", { notNamed: null }]);
    });
  });

  describe("matching objects (should convert null to empty string)", () => {
    it("should convert null fields to empty string in named objects", () => {
      const input = { name: "m_deposit_account", fields: null };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.name).toBe("m_deposit_account");
      expect(result.fields).toBe("");
    });

    it("should NOT convert null value to empty string (value is typically optional)", () => {
      // The 'value' property is often optional in schemas, so it should NOT be converted
      // to empty string. Instead, it should remain null and later become undefined
      // via convertNullToUndefined.
      const input = { name: "ZERO", value: null };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.name).toBe("ZERO");
      expect(result.value).toBeNull(); // NOT converted
    });

    it("should NOT convert null type to empty string (type is typically optional)", () => {
      const input = { name: "testVar", type: null };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.name).toBe("testVar");
      expect(result.type).toBeNull(); // NOT converted
    });

    it("should NOT convert null description to empty string (description is typically optional)", () => {
      const input = { name: "MyClass", description: null };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.name).toBe("MyClass");
      expect(result.description).toBeNull(); // NOT converted
    });

    it("should NOT convert null purpose to empty string (purpose is typically optional)", () => {
      const input = { name: "helper", purpose: null };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.name).toBe("helper");
      expect(result.purpose).toBeNull(); // NOT converted
    });

    it("should NOT convert null returnType to empty string (returnType is typically optional)", () => {
      const input = { name: "calculateSum", returnType: null };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.name).toBe("calculateSum");
      expect(result.returnType).toBeNull(); // NOT converted
    });

    it("should only convert null fields property (the only required string candidate)", () => {
      const input = { name: "TestClass", description: null, purpose: null, fields: null };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.name).toBe("TestClass");
      expect(result.description).toBeNull(); // NOT converted
      expect(result.purpose).toBeNull(); // NOT converted
      expect(result.fields).toBe(""); // Converted - fields is required string in tablesSchema
    });

    it("should preserve non-null values in named objects", () => {
      const input = {
        name: "m_currency",
        fields: "id, code, decimal_places",
        description: "Currency table",
      };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.name).toBe("m_currency");
      expect(result.fields).toBe("id, code, decimal_places");
      expect(result.description).toBe("Currency table");
    });
  });

  describe("arrays of named objects", () => {
    it("should convert null fields in arrays of table objects", () => {
      // This is the actual error case from the log files
      const input = {
        tables: [
          { name: "m_currency", fields: "id, code, decimal_places" },
          { name: "m_deposit_account", fields: null },
          { name: "m_deposit_account_transaction", fields: null },
          { name: "m_product_deposit", fields: null },
        ],
      };

      const result = convertNullToEmptyStringForRequiredFields(input) as {
        tables: { name: string; fields: string }[];
      };

      expect(result.tables).toHaveLength(4);
      expect(result.tables[0].fields).toBe("id, code, decimal_places");
      expect(result.tables[1].fields).toBe("");
      expect(result.tables[2].fields).toBe("");
      expect(result.tables[3].fields).toBe("");
    });

    it("should handle mixed objects - some matching, some not", () => {
      const input = [
        { name: "Table1", fields: null }, // should convert
        { notName: "Table2", fields: null }, // should NOT convert
        { name: "Table3", fields: "id, value" }, // already has value
      ];

      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>[];

      expect(result[0].fields).toBe("");
      expect(result[1].fields).toBeNull();
      expect(result[2].fields).toBe("id, value");
    });
  });

  describe("nested objects", () => {
    it("should recursively process nested objects with name properties", () => {
      const input = {
        level1: "value1",
        nested: {
          name: "NestedTable",
          fields: null,
          deeperNested: {
            name: "DeepTable",
            fields: null,
          },
        },
      };

      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.level1).toBe("value1");
      const nested = result.nested as Record<string, unknown>;
      expect(nested.fields).toBe("");
      const deeperNested = nested.deeperNested as Record<string, unknown>;
      expect(deeperNested.fields).toBe("");
    });

    it("should handle complex real-world structure from SQL analysis", () => {
      const input = {
        purpose: "This SQL script manages the database schema",
        implementation: "The script creates tables...",
        tables: [
          { name: "m_currency", fields: "id, code, decimal_places" },
          { name: "m_deposit_account", fields: null },
        ],
        storedProcedures: [],
        triggers: [],
        databaseIntegration: {
          mechanism: "DDL",
          description: "Uses DDL statements",
        },
      };

      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;
      const tables = result.tables as { name: string; fields: string }[];

      expect(tables[0].fields).toBe("id, code, decimal_places");
      expect(tables[1].fields).toBe("");
      expect(result.purpose).toBe("This SQL script manages the database schema");
    });
  });

  describe("circular references", () => {
    it("should handle circular references without infinite recursion", () => {
      const obj: Record<string, unknown> = { name: "test", fields: null };
      obj.self = obj;

      // Call the function and verify it doesn't crash
      const result = convertNullToEmptyStringForRequiredFields(obj) as Record<string, unknown>;

      // Verify expected properties without comparing circular references
      expect(result.name).toBe("test");
      expect(result.fields).toBe("");
      // The circular reference should be preserved - check identity without serialization
      expect(typeof result.self).toBe("object");
      expect(result.self !== null).toBe(true);
    });
  });

  describe("edge cases", () => {
    it("should handle empty objects", () => {
      const result = convertNullToEmptyStringForRequiredFields({});
      expect(result).toEqual({});
    });

    it("should handle empty arrays", () => {
      const result = convertNullToEmptyStringForRequiredFields([]);
      expect(result).toEqual([]);
    });

    it("should handle objects with empty name string", () => {
      const input = { name: "", fields: null };
      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      // Empty string name is still a string, so it matches
      expect(result.name).toBe("");
      expect(result.fields).toBe("");
    });

    it("should not modify arrays directly containing null", () => {
      const input = [null, null];
      const result = convertNullToEmptyStringForRequiredFields(input);
      expect(result).toEqual([null, null]);
    });

    it("should handle Date objects within structure", () => {
      const date = new Date("2025-01-01");
      const input = { name: "entry", fields: null, timestamp: date };

      const result = convertNullToEmptyStringForRequiredFields(input) as Record<string, unknown>;

      expect(result.name).toBe("entry");
      expect(result.fields).toBe(""); // fields is a candidate, gets converted
      expect(result.timestamp).toBe(date);
    });
  });

  describe("real-world scenario from error logs", () => {
    it("should fix the actual SQL tables validation error", () => {
      // Exact structure from error log response-error-2026-02-01T21-24-41-733Z.log
      const input = {
        purpose: "This SQL script manages the database schema for a financial application...",
        implementation: "The script starts by disabling foreign key checks...",
        tables: [
          { name: "m_currency", fields: "id, code, decimal_places, display_symbol, name" },
          { name: "m_organisation_currency", fields: "id, code, decimal_places, name" },
          // ... many more tables ...
          { name: "stretchy_report_parameter", fields: "report_id, parameter_id" },
          { name: "m_deposit_account", fields: null }, // THE PROBLEM FIELD
          { name: "m_deposit_account_transaction", fields: null }, // THE PROBLEM FIELD
          { name: "m_product_deposit", fields: null }, // THE PROBLEM FIELD
        ],
        storedProcedures: [],
        triggers: [],
        databaseIntegration: {
          mechanism: "DDL",
          description: "Uses DDL to define and manage the database schema",
        },
      };

      const result = convertNullToEmptyStringForRequiredFields(input) as {
        tables: { name: string; fields: string }[];
      };

      // All tables should now have string fields (not null)
      for (const table of result.tables) {
        expect(typeof table.fields).toBe("string");
      }

      // Specifically check the problematic entries
      const depositAccount = result.tables.find((t) => t.name === "m_deposit_account");
      expect(depositAccount?.fields).toBe("");

      const depositAccountTx = result.tables.find(
        (t) => t.name === "m_deposit_account_transaction",
      );
      expect(depositAccountTx?.fields).toBe("");

      const productDeposit = result.tables.find((t) => t.name === "m_product_deposit");
      expect(productDeposit?.fields).toBe("");
    });

    it("should NOT convert public constants with null value (value is optional)", () => {
      // The 'value' property in publicConstants is optional
      // The FineractClient.java issue was about embedded JSON in strings (a sanitizer issue)
      // not about null values
      const input = {
        name: "FineractClient",
        publicConstants: [{ name: "DATE_FORMAT", value: null }],
      };

      const result = convertNullToEmptyStringForRequiredFields(input) as {
        name: string;
        publicConstants: { name: string; value: unknown }[];
      };

      // value remains null, will be handled by convertNullToUndefined
      expect(result.publicConstants[0].value).toBeNull();
    });
  });
});
