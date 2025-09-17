import {
  TableViewModel,
  ProcessedListItem,
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
    it("should process empty arrays as empty text", () => {
      const data = [{ items: [] }];
      const vm = new TableViewModel(data);
      const rows = vm.getProcessedRows();

      expect(rows[0][0]).toEqual({
        type: "text",
        content: "[]",
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
          { type: "primitive", content: "null" },
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
});
