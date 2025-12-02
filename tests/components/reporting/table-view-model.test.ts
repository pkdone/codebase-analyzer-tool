import {
  TableViewModel,
  ProcessedListItem,
  isDisplayableTableRow,
  isDisplayableTableRowArray,
} from "../../../src/components/reporting/view-models/table-view-model";

describe("TableViewModel", () => {
  describe("constructor and basic properties", () => {
    it("should initialize with empty data", () => {
      const viewModel = new TableViewModel([]);

      expect(viewModel.hasData()).toBe(false);
      expect(viewModel.getDisplayHeaders()).toEqual([]);
      expect(viewModel.getProcessedRows()).toEqual([]);
    });

    it("should initialize with data and extract headers", () => {
      const data = [
        { name: "John", age: 30, isActive: true },
        { name: "Jane", age: 25, isActive: false },
      ];
      const viewModel = new TableViewModel(data);

      expect(viewModel.hasData()).toBe(true);
      expect(viewModel.getDisplayHeaders()).toEqual(["Name", "Age", "Is Active"]);
    });

    it("should handle single row data", () => {
      const data = [{ firstName: "John", lastName: "Doe" }];
      const viewModel = new TableViewModel(data);

      expect(viewModel.hasData()).toBe(true);
      expect(viewModel.getDisplayHeaders()).toEqual(["First Name", "Last Name"]);
      expect(viewModel.getProcessedRows()).toHaveLength(1);
    });
  });

  describe("getDisplayHeaders", () => {
    it("should convert camelCase to Display Case", () => {
      const data = [{ camelCaseField: "value", anotherField: "value2" }];
      const viewModel = new TableViewModel(data);

      expect(viewModel.getDisplayHeaders()).toEqual(["Camel Case Field", "Another Field"]);
    });

    it("should handle single word headers", () => {
      const data = [{ name: "John", age: 30 }];
      const viewModel = new TableViewModel(data);

      expect(viewModel.getDisplayHeaders()).toEqual(["Name", "Age"]);
    });

    it("should handle fields with numbers", () => {
      const data = [{ field1: "value", field2Test: "value" }];
      const viewModel = new TableViewModel(data);

      expect(viewModel.getDisplayHeaders()).toEqual(["Field1", "Field2Test"]);
    });
  });

  describe("processCell - basic types", () => {
    it("should process string values as text", () => {
      const data = [{ message: "Hello World" }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "text",
        content: "Hello World",
      });
    });

    it("should process number values as text", () => {
      const data = [{ count: 42 }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "text",
        content: "42",
      });
    });

    it("should process boolean values as text", () => {
      const data = [{ isActive: true, isComplete: false }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "text",
        content: "true",
      });
      expect(rows[0][1]).toEqual({
        type: "text",
        content: "false",
      });
    });

    it("should process null values as empty text", () => {
      const data = [{ nullField: null }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "text",
        content: "",
      });
    });

    it("should process undefined values as empty text", () => {
      const data = [{ undefinedField: undefined }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "text",
        content: "",
      });
    });

    it("should process object values as JSON string", () => {
      const data = [{ config: { timeout: 5000, retries: 3 } }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "text",
        content: '{"timeout":5000,"retries":3}',
      });
    });
  });

  describe("processCell - special field types", () => {
    it("should process link fields as link type", () => {
      const data = [{ link: "https://example.com" }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "link",
        content: "https://example.com",
      });
    });

    it("should process codeExample fields as code type", () => {
      const data = [{ codeExample: "const x = 5;" }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "code",
        content: "const x = 5;",
      });
    });

    it("should process non-string link fields as text", () => {
      const data = [{ link: 12345 }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "text",
        content: "12345",
      });
    });

    it("should process non-string codeExample fields as text", () => {
      const data = [{ codeExample: { code: "const x = 5;" } }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "text",
        content: '{"code":"const x = 5;"}',
      });
    });
  });

  describe("processCell - array handling", () => {
    it("should process empty arrays as empty list", () => {
      const data = [{ items: [] }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "list",
        content: [],
      });
    });

    it("should process arrays with primitive values as list", () => {
      const data = [{ tags: ["typescript", "testing", "jest"] }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "list",
        content: [
          { type: "primitive", content: "typescript" },
          { type: "primitive", content: "testing" },
          { type: "primitive", content: "jest" },
        ],
      });
    });

    it("should process arrays with object values as list", () => {
      const data = [
        {
          users: [
            { firstName: "John", lastName: "Doe" },
            { firstName: "Jane", lastName: "Smith" },
          ],
        },
      ];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "list",
        content: [
          {
            type: "object",
            content: {
              "First Name": "John",
              "Last Name": "Doe",
            },
          },
          {
            type: "object",
            content: {
              "First Name": "Jane",
              "Last Name": "Smith",
            },
          },
        ],
      });
    });

    it("should process mixed arrays correctly", () => {
      const data = [{ mixed: ["string", 42, { key: "value" }, null] }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "list",
        content: [
          { type: "primitive", content: "string" },
          { type: "primitive", content: "42" },
          { type: "object", content: { Key: "value" } },
          { type: "primitive", content: "" }, // null is converted to empty string for display
        ],
      });
    });

    it("should handle nested objects in arrays with null/undefined values", () => {
      const data = [
        {
          items: [
            { name: "Item 1", value: null, active: true },
            { name: "Item 2", value: undefined, active: false },
          ],
        },
      ];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "list",
        content: [
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
        ],
      });
    });

    it("should handle Date objects in arrays by stringifying them instead of using String()", () => {
      const testDate = new Date("2024-01-15T10:30:00Z");
      const data = [
        {
          timestamps: [testDate, "2024-01-16", null],
        },
      ];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      const listContent = rows[0][0].content as ProcessedListItem[];
      expect(listContent[0].type).toBe("primitive");
      // Date should be stringified, not converted to "[object Object]"
      expect(listContent[0].content).toBe(JSON.stringify(testDate));
      expect(listContent[1].content).toBe("2024-01-16");
      expect(listContent[2].content).toBe("");
    });

    it("should handle non-plain objects in arrays by stringifying them", () => {
      class CustomClass {
        constructor(public value: string) {}
      }
      const customInstance = new CustomClass("test");
      const data = [
        {
          items: [customInstance, { plain: "object" }],
        },
      ];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      const listContent = rows[0][0].content as ProcessedListItem[];
      // Custom class instance should be stringified, not "[object Object]"
      expect(listContent[0].type).toBe("primitive");
      expect(listContent[0].content).toBe(JSON.stringify(customInstance));
      // Plain object should still be processed as object type
      expect(listContent[1].type).toBe("object");
    });
  });

  describe("full row processing", () => {
    it("should process complete rows with mixed data types", () => {
      const data = [
        {
          id: 1,
          name: "Test Item",
          isActive: true,
          config: { timeout: 5000 },
          tags: ["tag1", "tag2"],
          link: "https://example.com",
          codeExample: "console.log('hello');",
          nullValue: null,
        },
      ];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows).toHaveLength(1);
      expect(rows[0]).toHaveLength(8);

      // Check specific cells
      expect(rows[0][0]).toEqual({ type: "text", content: "1" }); // id
      expect(rows[0][1]).toEqual({ type: "text", content: "Test Item" }); // name
      expect(rows[0][2]).toEqual({ type: "text", content: "true" }); // isActive
      expect(rows[0][3]).toEqual({ type: "text", content: '{"timeout":5000}' }); // config
      expect(rows[0][4]).toEqual({
        // tags
        type: "list",
        content: [
          { type: "primitive", content: "tag1" },
          { type: "primitive", content: "tag2" },
        ],
      });
      expect(rows[0][5]).toEqual({ type: "link", content: "https://example.com" }); // link
      expect(rows[0][6]).toEqual({ type: "code", content: "console.log('hello');" }); // codeExample
      expect(rows[0][7]).toEqual({ type: "text", content: "" }); // nullValue
    });

    it("should process multiple rows consistently", () => {
      const data = [
        { name: "Row 1", value: 10, items: ["a", "b"] },
        { name: "Row 2", value: 20, items: ["c", "d"] },
        { name: "Row 3", value: 30, items: ["e", "f"] },
      ];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows).toHaveLength(3);

      rows.forEach((row, index) => {
        expect(row).toHaveLength(3);
        expect(row[0]).toEqual({ type: "text", content: `Row ${index + 1}` });
        expect(row[1]).toEqual({ type: "text", content: `${(index + 1) * 10}` });
        expect(row[2].type).toBe("list");
      });
    });
  });

  describe("edge cases", () => {
    it("should handle data with inconsistent fields", () => {
      const data = [
        { name: "John", age: 30 },
        { name: "Jane" }, // missing age
        { name: "Bob", age: 25, city: "NYC" }, // extra field
      ];
      // Note: TableViewModel uses headers from first row only
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(vm.getDisplayHeaders()).toEqual(["Name", "Age"]);
      expect(rows).toHaveLength(3);

      // Second row should have undefined for age
      expect(rows[1][1]).toEqual({ type: "text", content: "" });
    });

    it("should handle complex nested structures", () => {
      const data = [
        {
          complexField: [
            {
              nestedArray: ["item1", "item2"],
              nestedObject: { prop1: "value1", prop2: "value2" },
            },
          ],
        },
      ];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0].type).toBe("list");
      expect(rows[0][0].content).toHaveLength(1);

      const listItem = (rows[0][0].content as ProcessedListItem[])[0];
      expect(listItem.type).toBe("object");
      expect(listItem.content).toEqual({
        "Nested Array": '["item1","item2"]',
        "Nested Object": '{"prop1":"value1","prop2":"value2"}',
      });
    });

    it("should handle circular references gracefully", () => {
      // Create a circular reference
      const obj: any = { name: "circular" };
      obj.self = obj;
      const data = [{ name: "test", circularRef: obj }];

      const vm = new TableViewModel(data);

      // Should throw due to circular reference in JSON.stringify
      expect(() => vm.getProcessedRows()).toThrow();
    });
  });

  describe("generic type parameter", () => {
    it("should work with strongly-typed data structures", () => {
      interface FileTypeData extends Record<string, unknown> {
        fileType: string;
        lines: number;
        files: number;
      }

      const fileTypesData: FileTypeData[] = [
        { fileType: "TypeScript", lines: 1000, files: 50 },
        { fileType: "JavaScript", lines: 500, files: 25 },
      ];

      const vm = new TableViewModel<FileTypeData>(fileTypesData);

      expect(vm.hasData()).toBe(true);
      expect(vm.getDisplayHeaders()).toEqual(["File Type", "Lines", "Files"]);
      expect(vm.getProcessedRows()).toHaveLength(2);
    });

    it("should work with nested typed structures", () => {
      interface DatabaseIntegration extends Record<string, unknown> {
        path: string;
        mechanism: string;
        description: string;
        codeExample: string;
      }

      const dbData: DatabaseIntegration[] = [
        {
          path: "/src/db/connection.ts",
          mechanism: "MongoDB",
          description: "Database connection handler",
          codeExample: "const client = new MongoClient(url);",
        },
      ];

      const vm = new TableViewModel<DatabaseIntegration>(dbData);

      expect(vm.hasData()).toBe(true);
      expect(vm.getDisplayHeaders()).toEqual(["Path", "Mechanism", "Description", "Code Example"]);

      const rows = vm.getProcessedRows();
      expect(rows[0][3]).toEqual({
        type: "code",
        content: "const client = new MongoClient(url);",
      });
    });

    it("should maintain type safety with default parameter", () => {
      const genericData = [
        { key: "value1", count: 10 },
        { key: "value2", count: 20 },
      ];

      // Should work without explicit type parameter
      const vm = new TableViewModel(genericData);

      expect(vm.hasData()).toBe(true);
      expect(vm.getProcessedRows()).toHaveLength(2);
    });

    it("should handle complex union types in generic parameter", () => {
      interface ProcedureItem extends Record<string, unknown> {
        name: string;
        type: "STORED PROCEDURE";
        complexity: "LOW" | "MEDIUM" | "HIGH";
      }

      interface TriggerItem extends Record<string, unknown> {
        name: string;
        type: "TRIGGER";
        complexity: "LOW" | "MEDIUM" | "HIGH";
      }

      type DatabaseObject = ProcedureItem | TriggerItem;

      const items: DatabaseObject[] = [
        { name: "GetUser", type: "STORED PROCEDURE", complexity: "LOW" },
        { name: "AfterInsert", type: "TRIGGER", complexity: "MEDIUM" },
      ];

      const vm = new TableViewModel<DatabaseObject>(items);

      expect(vm.hasData()).toBe(true);
      expect(vm.getDisplayHeaders()).toEqual(["Name", "Type", "Complexity"]);
      expect(vm.getProcessedRows()).toHaveLength(2);
    });
  });

  describe("Type Guards", () => {
    describe("isDisplayableTableRow", () => {
      it("should return true for valid object records", () => {
        expect(isDisplayableTableRow({ name: "John", age: 30 })).toBe(true);
        expect(isDisplayableTableRow({ a: 1, b: "test", c: true })).toBe(true);
        expect(isDisplayableTableRow({})).toBe(true); // Empty object is valid
      });

      it("should return false for null and undefined", () => {
        expect(isDisplayableTableRow(null)).toBe(false);
        expect(isDisplayableTableRow(undefined)).toBe(false);
      });

      it("should return false for arrays", () => {
        expect(isDisplayableTableRow([])).toBe(false);
        expect(isDisplayableTableRow([1, 2, 3])).toBe(false);
        expect(isDisplayableTableRow([{ name: "John" }])).toBe(false);
      });

      it("should return false for primitive values", () => {
        expect(isDisplayableTableRow("string")).toBe(false);
        expect(isDisplayableTableRow(123)).toBe(false);
        expect(isDisplayableTableRow(true)).toBe(false);
      });

      it("should return true for objects with nested structures", () => {
        expect(isDisplayableTableRow({ nested: { value: "test" } })).toBe(true);
        expect(isDisplayableTableRow({ array: [1, 2, 3], obj: { a: 1 } })).toBe(true);
      });
    });

    describe("isDisplayableTableRowArray", () => {
      it("should return true for arrays of valid objects", () => {
        expect(isDisplayableTableRowArray([{ name: "John" }, { name: "Jane" }])).toBe(true);
        expect(
          isDisplayableTableRowArray([
            { a: 1, b: 2 },
            { c: 3, d: 4 },
          ]),
        ).toBe(true);
        expect(isDisplayableTableRowArray([])).toBe(true); // Empty array is valid
      });

      it("should return false for arrays containing non-objects", () => {
        expect(isDisplayableTableRowArray([{ name: "John" }, "string"])).toBe(false);
        expect(isDisplayableTableRowArray([1, 2, 3])).toBe(false);
        expect(isDisplayableTableRowArray(["a", "b", "c"])).toBe(false);
      });

      it("should return false for arrays containing null or undefined", () => {
        expect(isDisplayableTableRowArray([{ name: "John" }, null])).toBe(false);
        expect(isDisplayableTableRowArray([undefined, { name: "Jane" }])).toBe(false);
      });

      it("should return false for arrays containing arrays", () => {
        expect(isDisplayableTableRowArray([[{ name: "John" }]])).toBe(false);
        expect(isDisplayableTableRowArray([{ name: "John" }, [1, 2, 3]])).toBe(false);
      });

      it("should return false for non-array values", () => {
        expect(isDisplayableTableRowArray({ name: "John" })).toBe(false);
        expect(isDisplayableTableRowArray("string")).toBe(false);
        expect(isDisplayableTableRowArray(null)).toBe(false);
        expect(isDisplayableTableRowArray(undefined)).toBe(false);
      });

      it("should handle complex valid arrays", () => {
        const validArray = [
          { id: 1, name: "Item 1", data: [1, 2, 3] },
          { id: 2, name: "Item 2", nested: { value: "test" } },
        ];
        expect(isDisplayableTableRowArray(validArray)).toBe(true);
      });
    });
  });
});
