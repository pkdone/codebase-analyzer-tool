import {
  formatRow,
  type ProcessedListItem,
} from "../../../../../src/app/components/reporting/table";

describe("TableDataFormatter", () => {
  describe("formatRow() - formatCell() integration", () => {
    describe("basic types", () => {
      it("should format string values as text", () => {
        const result = formatRow(["message"], { message: "Hello World" });
        expect(result[0]).toEqual({
          type: "text",
          content: "Hello World",
        });
      });

      it("should format number values as text", () => {
        const result = formatRow(["count"], { count: 42 });
        expect(result[0]).toEqual({
          type: "text",
          content: "42",
        });
      });

      it("should format boolean values as text", () => {
        const result1 = formatRow(["isActive"], { isActive: true });
        expect(result1[0]).toEqual({
          type: "text",
          content: "true",
        });
        const result2 = formatRow(["isComplete"], { isComplete: false });
        expect(result2[0]).toEqual({
          type: "text",
          content: "false",
        });
      });

      it("should format null values as empty text", () => {
        const result = formatRow(["nullField"], { nullField: null });
        expect(result[0]).toEqual({
          type: "text",
          content: "",
        });
      });

      it("should format undefined values as empty text", () => {
        const result = formatRow(["undefinedField"], {});
        expect(result[0]).toEqual({
          type: "text",
          content: "",
        });
      });

      it("should format object values as JSON string", () => {
        const result = formatRow(["config"], { config: { timeout: 5000, retries: 3 } });
        expect(result[0]).toEqual({
          type: "text",
          content: '{"timeout":5000,"retries":3}',
        });
      });
    });

    describe("special field types", () => {
      it("should format link fields as link type", () => {
        const result = formatRow(["link"], { link: "https://example.com" });
        expect(result[0]).toEqual({
          type: "link",
          content: "https://example.com",
        });
      });

      it("should format codeExample fields as code type", () => {
        const result = formatRow(["codeExample"], { codeExample: "const x = 5;" });
        expect(result[0]).toEqual({
          type: "code",
          content: "const x = 5;",
        });
      });

      it("should format non-string link fields as text", () => {
        const result = formatRow(["link"], { link: 12345 });
        expect(result[0]).toEqual({
          type: "text",
          content: "12345",
        });
      });

      it("should format non-string codeExample fields as text", () => {
        const result = formatRow(["codeExample"], { codeExample: { code: "const x = 5;" } });
        expect(result[0]).toEqual({
          type: "text",
          content: '{"code":"const x = 5;"}',
        });
      });
    });

    describe("array handling", () => {
      it("should format empty arrays as empty list", () => {
        const result = formatRow(["items"], { items: [] });
        expect(result[0]).toEqual({
          type: "list",
          content: [],
        });
      });

      it("should format arrays with primitive values as list", () => {
        const result = formatRow(["tags"], { tags: ["typescript", "testing", "jest"] });
        expect(result[0]).toEqual({
          type: "list",
          content: [
            { type: "primitive", content: "typescript" },
            { type: "primitive", content: "testing" },
            { type: "primitive", content: "jest" },
          ],
        });
      });

      it("should format arrays with object values as list", () => {
        const result = formatRow(["users"], {
          users: [
            { firstName: "John", lastName: "Doe" },
            { firstName: "Jane", lastName: "Smith" },
          ],
        });
        expect(result[0].type).toBe("list");
        const content = result[0].content as ProcessedListItem[];
        expect(content).toHaveLength(2);
        expect(content[0].type).toBe("object");
        expect(content[0].content).toEqual({
          "First Name": "John",
          "Last Name": "Doe",
        });
      });

      it("should handle nested objects in arrays with null/undefined values", () => {
        const result = formatRow(["items"], {
          items: [
            { name: "Item 1", value: null, active: true },
            { name: "Item 2", value: undefined, active: false },
          ],
        });
        const content = result[0].content as ProcessedListItem[];
        expect(content).toEqual([
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
        const result = formatRow(["dates"], { dates: [testDate, "2024-01-16", null] });
        const content = result[0].content as ProcessedListItem[];
        expect(content[0].type).toBe("primitive");
        expect(content[0].content).toBe(JSON.stringify(testDate));
        expect(content[1].content).toBe("2024-01-16");
        expect(content[2].content).toBe("");
      });

      it("should handle non-plain objects by stringifying them", () => {
        class CustomClass {
          constructor(public value: string) {}
        }
        const customInstance = new CustomClass("test");
        const result = formatRow(["items"], { items: [customInstance, { plain: "object" }] });
        const content = result[0].content as ProcessedListItem[];
        expect(content[0].type).toBe("primitive");
        expect(content[0].content).toBe(JSON.stringify(customInstance));
        expect(content[1].type).toBe("object");
      });
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
