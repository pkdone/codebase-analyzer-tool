import { createCategoryHandler } from "../../../../../../src/app/components/reporting/data-processing/handlers";
import type { CategoryDataHandler } from "../../../../../../src/app/components/reporting/data-processing/handlers";
import {
  isAppSummaryNameDescArray,
  isBusinessProcessesArray,
  isBoundedContextsArray,
  isPotentialMicroservicesArray,
} from "../../../../../../src/app/components/reporting/data-processing/category-data-type-guards";
import type { AppSummaryNameDescArray } from "../../../../../../src/app/repositories/app-summaries/app-summaries.model";

describe("createCategoryHandler", () => {
  describe("handler creation", () => {
    it("should create a handler with the specified category", () => {
      const handler = createCategoryHandler("technologies", isAppSummaryNameDescArray);
      expect(handler.category).toBe("technologies");
    });

    it("should create a handler with a process function", () => {
      const handler = createCategoryHandler("technologies", isAppSummaryNameDescArray);
      expect(typeof handler.process).toBe("function");
    });

    it("should implement CategoryDataHandler interface", () => {
      const handler: CategoryDataHandler = createCategoryHandler(
        "technologies",
        isAppSummaryNameDescArray,
      );
      expect(handler.category).toBeDefined();
      expect(handler.process).toBeDefined();
    });
  });

  describe("process function behavior", () => {
    it("should return valid data when type guard passes", () => {
      const handler = createCategoryHandler("technologies", isAppSummaryNameDescArray);
      const testData: AppSummaryNameDescArray = [
        { name: "React", description: "UI library" },
        { name: "TypeScript", description: "Type-safe JavaScript" },
      ];

      const result = handler.process("Test Label", testData);

      expect(result).toEqual({
        category: "technologies",
        label: "Test Label",
        data: testData,
      });
    });

    it("should return empty array when type guard fails", () => {
      const handler = createCategoryHandler("technologies", isAppSummaryNameDescArray);
      const testData = "not an array";

      const result = handler.process("Test Label", testData);

      expect(result).toEqual({
        category: "technologies",
        label: "Test Label",
        data: [],
      });
    });

    it("should return empty array for null input when type guard fails", () => {
      const handler = createCategoryHandler("technologies", isAppSummaryNameDescArray);

      const result = handler.process("Test Label", null);

      expect(result).toEqual({
        category: "technologies",
        label: "Test Label",
        data: [],
      });
    });

    it("should return empty array for undefined input when type guard fails", () => {
      const handler = createCategoryHandler("technologies", isAppSummaryNameDescArray);

      const result = handler.process("Test Label", undefined);

      expect(result).toEqual({
        category: "technologies",
        label: "Test Label",
        data: [],
      });
    });

    it("should preserve the label passed to process", () => {
      const handler = createCategoryHandler("technologies", isAppSummaryNameDescArray);
      const testData: AppSummaryNameDescArray = [];

      const result = handler.process("Custom Label", testData);

      expect(result?.label).toBe("Custom Label");
    });

    it("should preserve the category in the result", () => {
      const handler = createCategoryHandler("businessProcesses", isBusinessProcessesArray);
      const testData = [{ name: "Process", description: "A business process" }];

      const result = handler.process("Test", testData);

      expect(result?.category).toBe("businessProcesses");
    });
  });

  describe("type guard integration", () => {
    it("should correctly validate AppSummaryNameDescArray", () => {
      const handler = createCategoryHandler("technologies", isAppSummaryNameDescArray);

      // Valid AppSummaryNameDescArray
      const validResult = handler.process("Test", [
        { name: "Tech1", description: "Description 1" },
      ]);
      expect(validResult?.data).toEqual([{ name: "Tech1", description: "Description 1" }]);

      // Invalid - missing description
      const invalidResult = handler.process("Test", [{ name: "Tech1" }]);
      expect(invalidResult?.data).toEqual([]);

      // Invalid - not an array
      const notArrayResult = handler.process("Test", "not an array");
      expect(notArrayResult?.data).toEqual([]);
    });

    it("should correctly validate BusinessProcessesArray", () => {
      const handler = createCategoryHandler("businessProcesses", isBusinessProcessesArray);

      // Valid BusinessProcessesArray - must include keyBusinessActivities per schema
      const validData = [
        {
          name: "Process1",
          description: "Business process 1",
          keyBusinessActivities: [{ activity: "Step1", description: "First step" }],
        },
      ];
      const validResult = handler.process("Test", validData);
      expect(validResult?.data).toEqual(validData);

      // Invalid - not an array
      const invalidResult = handler.process("Test", "not an array");
      expect(invalidResult?.data).toEqual([]);
    });
  });

  describe("different categories with matching type guards", () => {
    it("should create handler for technologies category", () => {
      const handler = createCategoryHandler("technologies", isAppSummaryNameDescArray);
      expect(handler.category).toBe("technologies");

      const result = handler.process("Test", [{ name: "Tech", description: "Desc" }]);
      expect(result?.category).toBe("technologies");
    });

    it("should create handler for businessProcesses category", () => {
      const handler = createCategoryHandler("businessProcesses", isBusinessProcessesArray);
      expect(handler.category).toBe("businessProcesses");

      const result = handler.process("Test", [{ name: "Process", description: "Desc" }]);
      expect(result?.category).toBe("businessProcesses");
    });

    it("should create handler for boundedContexts category", () => {
      const handler = createCategoryHandler("boundedContexts", isBoundedContextsArray);
      expect(handler.category).toBe("boundedContexts");

      const result = handler.process("Test", []);
      expect(result?.category).toBe("boundedContexts");
    });

    it("should create handler for potentialMicroservices category", () => {
      const handler = createCategoryHandler(
        "potentialMicroservices",
        isPotentialMicroservicesArray,
      );
      expect(handler.category).toBe("potentialMicroservices");

      const result = handler.process("Test", []);
      expect(result?.category).toBe("potentialMicroservices");
    });
  });

  describe("type safety", () => {
    /**
     * This test verifies that the generic factory enforces type safety at compile time.
     * The factory now requires that the type guard's return type matches the expected
     * data type for the given category. A mismatched type guard would cause a compile error.
     *
     * For example, this would NOT compile (commented out to show intent):
     * ```typescript
     * // ERROR: isBusinessProcessesArray returns BusinessProcessesArray,
     * // but "technologies" expects AppSummaryNameDescArray
     * createCategoryHandler("technologies", isBusinessProcessesArray);
     * ```
     *
     * This runtime test verifies the handlers work correctly when properly typed.
     */
    it("should enforce category-data type relationship at compile time", () => {
      // These are valid combinations that compile successfully
      const techHandler = createCategoryHandler("technologies", isAppSummaryNameDescArray);
      const processHandler = createCategoryHandler("businessProcesses", isBusinessProcessesArray);

      // Verify they produce correct output
      const techData: AppSummaryNameDescArray = [{ name: "React", description: "UI library" }];
      expect(techHandler.process("Tech", techData)?.data).toEqual(techData);

      // BusinessProcessesArray requires keyBusinessActivities per schema
      const processData = [
        {
          name: "Checkout",
          description: "Order checkout process",
          keyBusinessActivities: [{ activity: "Validate Cart", description: "Validates items" }],
        },
      ];
      expect(processHandler.process("Process", processData)?.data).toEqual(processData);
    });
  });
});
