import { createCategoryHandler } from "../../../../../../src/app/components/reporting/data-processing/handlers";
import type { CategoryDataHandler } from "../../../../../../src/app/components/reporting/data-processing/handlers";

describe("createCategoryHandler", () => {
  // Simple type guard for testing
  const isStringArray = (data: unknown): data is string[] => {
    return Array.isArray(data) && data.every((item) => typeof item === "string");
  };

  // Type guard that always returns true
  const alwaysTrue = (data: unknown): data is unknown[] => {
    return Array.isArray(data);
  };

  // Type guard that always returns false
  const alwaysFalse = (_data: unknown): _data is never => {
    return false;
  };

  describe("handler creation", () => {
    it("should create a handler with the specified category", () => {
      const handler = createCategoryHandler("technologies", isStringArray);
      expect(handler.category).toBe("technologies");
    });

    it("should create a handler with a process function", () => {
      const handler = createCategoryHandler("technologies", isStringArray);
      expect(typeof handler.process).toBe("function");
    });

    it("should implement CategoryDataHandler interface", () => {
      const handler: CategoryDataHandler = createCategoryHandler("technologies", isStringArray);
      expect(handler.category).toBeDefined();
      expect(handler.process).toBeDefined();
    });
  });

  describe("process function behavior", () => {
    it("should return valid data when type guard passes", () => {
      const handler = createCategoryHandler("technologies", alwaysTrue);
      const testData = ["item1", "item2"];

      const result = handler.process("Test Label", testData);

      expect(result).toEqual({
        category: "technologies",
        label: "Test Label",
        data: testData,
      });
    });

    it("should return empty array when type guard fails", () => {
      const handler = createCategoryHandler("technologies", alwaysFalse);
      const testData = ["item1", "item2"];

      const result = handler.process("Test Label", testData);

      expect(result).toEqual({
        category: "technologies",
        label: "Test Label",
        data: [],
      });
    });

    it("should return empty array for null input when type guard fails", () => {
      const handler = createCategoryHandler("technologies", isStringArray);

      const result = handler.process("Test Label", null);

      expect(result).toEqual({
        category: "technologies",
        label: "Test Label",
        data: [],
      });
    });

    it("should return empty array for undefined input when type guard fails", () => {
      const handler = createCategoryHandler("technologies", isStringArray);

      const result = handler.process("Test Label", undefined);

      expect(result).toEqual({
        category: "technologies",
        label: "Test Label",
        data: [],
      });
    });

    it("should preserve the label passed to process", () => {
      const handler = createCategoryHandler("technologies", alwaysTrue);

      const result = handler.process("Custom Label", []);

      expect(result?.label).toBe("Custom Label");
    });

    it("should preserve the category in the result", () => {
      const handler = createCategoryHandler("businessProcesses", alwaysTrue);

      const result = handler.process("Test", []);

      expect(result?.category).toBe("businessProcesses");
    });
  });

  describe("type guard integration", () => {
    it("should correctly validate string arrays", () => {
      const handler = createCategoryHandler("technologies", isStringArray);

      // Valid string array
      const validResult = handler.process("Test", ["a", "b", "c"]);
      expect(validResult?.data).toEqual(["a", "b", "c"]);

      // Invalid - mixed array
      const invalidResult = handler.process("Test", ["a", 1, "c"]);
      expect(invalidResult?.data).toEqual([]);

      // Invalid - not an array
      const notArrayResult = handler.process("Test", "not an array");
      expect(notArrayResult?.data).toEqual([]);
    });

    it("should work with complex type guards", () => {
      interface TestItem {
        id: number;
        name: string;
      }
      const isTestItemArray = (data: unknown): data is TestItem[] => {
        return (
          Array.isArray(data) &&
          data.every(
            (item) =>
              typeof item === "object" &&
              item !== null &&
              "id" in item &&
              typeof item.id === "number" &&
              "name" in item &&
              typeof item.name === "string",
          )
        );
      };

      const handler = createCategoryHandler("technologies", isTestItemArray);

      // Valid
      const validData = [
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ];
      expect(handler.process("Test", validData)?.data).toEqual(validData);

      // Invalid - missing name
      const invalidData = [{ id: 1 }];
      expect(handler.process("Test", invalidData)?.data).toEqual([]);
    });
  });

  describe("different categories", () => {
    const testCases: {
      category: "technologies" | "businessProcesses" | "boundedContexts" | "potentialMicroservices";
    }[] = [
      { category: "technologies" },
      { category: "businessProcesses" },
      { category: "boundedContexts" },
      { category: "potentialMicroservices" },
    ];

    testCases.forEach(({ category }) => {
      it(`should create handler for ${category} category`, () => {
        const handler = createCategoryHandler(category, alwaysTrue);
        expect(handler.category).toBe(category);

        const result = handler.process("Test", []);
        expect(result?.category).toBe(category);
      });
    });
  });
});
