import {
  formatCell,
  formatArrayValue,
  formatPrimitiveValue,
  formatRow,
  type ProcessedListItem,
} from "../../../../../src/app/components/reporting/formatters/table-data-formatter";

describe("TableDataFormatter", () => {
  describe("formatCell()", () => {
    describe("basic types", () => {
      it("should format string values as text", () => {
        const result = formatCell("message", "Hello World");
        expect(result).toEqual({
          type: "text",
          content: "Hello World",
        });
      });

      it("should format number values as text", () => {
        const result = formatCell("count", 42);
        expect(result).toEqual({
          type: "text",
          content: "42",
        });
      });

      it("should format boolean values as text", () => {
        expect(formatCell("isActive", true)).toEqual({
          type: "text",
          content: "true",
        });
        expect(formatCell("isComplete", false)).toEqual({
          type: "text",
          content: "false",
        });
      });

      it("should format null values as empty text", () => {
        const result = formatCell("nullField", null);
        expect(result).toEqual({
          type: "text",
          content: "",
        });
      });

      it("should format undefined values as empty text", () => {
        const result = formatCell("undefinedField", undefined);
        expect(result).toEqual({
          type: "text",
          content: "",
        });
      });

      it("should format object values as JSON string", () => {
        const result = formatCell("config", { timeout: 5000, retries: 3 });
        expect(result).toEqual({
          type: "text",
          content: '{"timeout":5000,"retries":3}',
        });
      });
    });

    describe("special field types", () => {
      it("should format link fields as link type", () => {
        const result = formatCell("link", "https://example.com");
        expect(result).toEqual({
          type: "link",
          content: "https://example.com",
        });
      });

      it("should format codeExample fields as code type", () => {
        const result = formatCell("codeExample", "const x = 5;");
        expect(result).toEqual({
          type: "code",
          content: "const x = 5;",
        });
      });

      it("should format non-string link fields as text", () => {
        const result = formatCell("link", 12345);
        expect(result).toEqual({
          type: "text",
          content: "12345",
        });
      });

      it("should format non-string codeExample fields as text", () => {
        const result = formatCell("codeExample", { code: "const x = 5;" });
        expect(result).toEqual({
          type: "text",
          content: '{"code":"const x = 5;"}',
        });
      });
    });

    describe("array handling", () => {
      it("should format empty arrays as empty list", () => {
        const result = formatCell("items", []);
        expect(result).toEqual({
          type: "list",
          content: [],
        });
      });

      it("should format arrays with primitive values as list", () => {
        const result = formatCell("tags", ["typescript", "testing", "jest"]);
        expect(result).toEqual({
          type: "list",
          content: [
            { type: "primitive", content: "typescript" },
            { type: "primitive", content: "testing" },
            { type: "primitive", content: "jest" },
          ],
        });
      });

      it("should format arrays with object values as list", () => {
        const result = formatCell("users", [
          { firstName: "John", lastName: "Doe" },
          { firstName: "Jane", lastName: "Smith" },
        ]);
        expect(result.type).toBe("list");
        const content = result.content as ProcessedListItem[];
        expect(content).toHaveLength(2);
        expect(content[0].type).toBe("object");
        expect(content[0].content).toEqual({
          "First Name": "John",
          "Last Name": "Doe",
        });
      });
    });
  });

  describe("formatArrayValue()", () => {
    it("should handle string values", () => {
      const result = formatArrayValue(["one", "two", "three"]);
      expect(result).toEqual([
        { type: "primitive", content: "one" },
        { type: "primitive", content: "two" },
        { type: "primitive", content: "three" },
      ]);
    });

    it("should handle number values", () => {
      const result = formatArrayValue([1, 2, 3]);
      expect(result).toEqual([
        { type: "primitive", content: "1" },
        { type: "primitive", content: "2" },
        { type: "primitive", content: "3" },
      ]);
    });

    it("should handle mixed arrays", () => {
      const result = formatArrayValue(["string", 42, { key: "value" }, null]);
      expect(result).toEqual([
        { type: "primitive", content: "string" },
        { type: "primitive", content: "42" },
        { type: "object", content: { Key: "value" } },
        { type: "primitive", content: "" },
      ]);
    });

    it("should handle nested objects in arrays with null/undefined values", () => {
      const result = formatArrayValue([
        { name: "Item 1", value: null, active: true },
        { name: "Item 2", value: undefined, active: false },
      ]);
      expect(result).toEqual([
        {
          type: "object",
          content: {
            Name: "Item 1",
            Value: "null",
            Active: "true",
          },
        },
        {
          type: "object",
          content: {
            Name: "Item 2",
            Value: "undefined",
            Active: "false",
          },
        },
      ]);
    });

    it("should handle Date objects by stringifying them", () => {
      const testDate = new Date("2024-01-15T10:30:00Z");
      const result = formatArrayValue([testDate, "2024-01-16", null]);
      expect(result[0].type).toBe("primitive");
      expect(result[0].content).toBe(JSON.stringify(testDate));
      expect(result[1].content).toBe("2024-01-16");
      expect(result[2].content).toBe("");
    });

    it("should handle non-plain objects by stringifying them", () => {
      class CustomClass {
        constructor(public value: string) {}
      }
      const customInstance = new CustomClass("test");
      const result = formatArrayValue([customInstance, { plain: "object" }]);
      expect(result[0].type).toBe("primitive");
      expect(result[0].content).toBe(JSON.stringify(customInstance));
      expect(result[1].type).toBe("object");
    });
  });

  describe("formatPrimitiveValue()", () => {
    it("should format strings", () => {
      expect(formatPrimitiveValue("hello")).toBe("hello");
    });

    it("should format numbers", () => {
      expect(formatPrimitiveValue(42)).toBe("42");
      expect(formatPrimitiveValue(3.14)).toBe("3.14");
    });

    it("should format booleans", () => {
      expect(formatPrimitiveValue(true)).toBe("true");
      expect(formatPrimitiveValue(false)).toBe("false");
    });

    it("should format null as empty string", () => {
      expect(formatPrimitiveValue(null)).toBe("");
    });

    it("should format undefined as empty string", () => {
      expect(formatPrimitiveValue(undefined)).toBe("");
    });

    it("should stringify objects", () => {
      expect(formatPrimitiveValue({ key: "value" })).toBe('{"key":"value"}');
    });

    it("should stringify bigint", () => {
      expect(formatPrimitiveValue(BigInt(123))).toBe("123");
    });

    it("should stringify symbols", () => {
      const sym = Symbol("test");
      expect(formatPrimitiveValue(sym)).toBe("Symbol(test)");
    });
  });

  describe("formatRow()", () => {
    it("should format a complete row", () => {
      const headers = ["id", "name", "isActive", "link"];
      const row = {
        id: 1,
        name: "Test Item",
        isActive: true,
        link: "https://example.com",
      };
      const result = formatRow(headers, row);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ type: "text", content: "1" });
      expect(result[1]).toEqual({ type: "text", content: "Test Item" });
      expect(result[2]).toEqual({ type: "text", content: "true" });
      expect(result[3]).toEqual({ type: "link", content: "https://example.com" });
    });

    it("should handle missing fields", () => {
      const headers = ["name", "age"];
      const row = { name: "John" }; // missing age
      const result = formatRow(headers, row);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ type: "text", content: "John" });
      expect(result[1]).toEqual({ type: "text", content: "" });
    });

    it("should maintain header order", () => {
      const headers = ["z", "a", "m"];
      const row = { a: "first", z: "second", m: "third" };
      const result = formatRow(headers, row);

      expect(result[0].content).toBe("second"); // z
      expect(result[1].content).toBe("first"); // a
      expect(result[2].content).toBe("third"); // m
    });
  });

  describe("integration tests", () => {
    it("should format complex table data correctly", () => {
      const headers = ["name", "tags", "config", "codeExample"];
      const row = {
        name: "Component",
        tags: ["typescript", "react"],
        config: { debug: true },
        codeExample: "export default Component;",
      };
      const result = formatRow(headers, row);

      expect(result[0]).toEqual({ type: "text", content: "Component" });
      expect(result[1].type).toBe("list");
      expect(result[2]).toEqual({
        type: "text",
        content: '{"debug":true}',
      });
      expect(result[3]).toEqual({
        type: "code",
        content: "export default Component;",
      });
    });
  });
});
