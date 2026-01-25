import "reflect-metadata";
import { BaseReportSection } from "../../../../../src/app/components/reporting/sections/base-report-section";
import type { PreparedHtmlReportData } from "../../../../../src/app/components/reporting/types/html-report-data.types";
import type { PreparedJsonData } from "../../../../../src/app/components/reporting/json-report-writer";
import type { ReportData } from "../../../../../src/app/components/reporting/report-data.types";

/**
 * Concrete test implementation of BaseReportSection.
 * Used to test the abstract base class functionality.
 */
class TestReportSection extends BaseReportSection {
  private readonly sectionName: string;

  constructor(name = "test-section") {
    super();
    this.sectionName = name;
  }

  getName(): string {
    return this.sectionName;
  }

  async getData(_projectName: string): Promise<Partial<ReportData>> {
    return {};
  }

  async prepareHtmlData(
    _baseData: ReportData,
    _sectionData: Partial<ReportData>,
    _htmlDir: string,
  ): Promise<Partial<PreparedHtmlReportData> | null> {
    return null;
  }

  prepareJsonData(_baseData: ReportData, _sectionData: Partial<ReportData>): PreparedJsonData[] {
    return [];
  }

  // Expose protected method for testing
  testPrepareSingleJsonData(data: unknown, filename: string): PreparedJsonData[] {
    return this.prepareSingleJsonData(data, filename);
  }
}

describe("BaseReportSection", () => {
  let section: TestReportSection;

  beforeEach(() => {
    section = new TestReportSection();
  });

  describe("getRequiredAppSummaryFields", () => {
    it("should return an empty array by default", () => {
      const result = section.getRequiredAppSummaryFields();

      expect(result).toEqual([]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("should be a readonly array", () => {
      const result = section.getRequiredAppSummaryFields();

      // The readonly nature is enforced at compile time,
      // but we verify it returns an array at runtime
      expect(result).toEqual([]);
    });
  });

  describe("prepareSingleJsonData", () => {
    it("should return array with single entry when data is provided", () => {
      const testData = { key: "value", nested: { items: [1, 2, 3] } };

      const result = section.testPrepareSingleJsonData(testData, "test-output.json");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        filename: "test-output.json",
        data: testData,
      });
    });

    it("should return empty array when data is undefined", () => {
      const result = section.testPrepareSingleJsonData(undefined, "test-output.json");

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should handle null data as valid data (not undefined)", () => {
      const result = section.testPrepareSingleJsonData(null, "null-data.json");

      // null is a valid JSON value, only undefined should be filtered out
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        filename: "null-data.json",
        data: null,
      });
    });

    it("should handle empty object data", () => {
      const result = section.testPrepareSingleJsonData({}, "empty-object.json");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        filename: "empty-object.json",
        data: {},
      });
    });

    it("should handle empty array data", () => {
      const result = section.testPrepareSingleJsonData([], "empty-array.json");

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        filename: "empty-array.json",
        data: [],
      });
    });

    it("should handle primitive data types", () => {
      const stringResult = section.testPrepareSingleJsonData("test string", "string.json");
      expect(stringResult[0].data).toBe("test string");

      const numberResult = section.testPrepareSingleJsonData(42, "number.json");
      expect(numberResult[0].data).toBe(42);

      const boolResult = section.testPrepareSingleJsonData(true, "bool.json");
      expect(boolResult[0].data).toBe(true);
    });

    it("should preserve filename exactly as provided", () => {
      const result = section.testPrepareSingleJsonData({}, "my-custom-file.json");

      expect(result[0].filename).toBe("my-custom-file.json");
    });

    it("should handle complex nested data structures", () => {
      const complexData = {
        level1: {
          level2: {
            level3: {
              value: "deep",
              array: [{ nested: true }],
            },
          },
        },
      };

      const result = section.testPrepareSingleJsonData(complexData, "complex.json");

      expect(result[0].data).toEqual(complexData);
    });
  });

  describe("interface implementation", () => {
    it("should correctly implement the ReportSection interface", () => {
      // Verify all interface methods exist and work
      expect(typeof section.getName).toBe("function");
      expect(typeof section.getRequiredAppSummaryFields).toBe("function");
      expect(typeof section.getData).toBe("function");
      expect(typeof section.prepareHtmlData).toBe("function");
      expect(typeof section.prepareJsonData).toBe("function");
    });

    it("should allow custom section names", () => {
      const customSection = new TestReportSection("custom-section-name");

      expect(customSection.getName()).toBe("custom-section-name");
    });

    it("should allow getData to be overridden with project-specific logic", async () => {
      const result = await section.getData("test-project");

      expect(result).toEqual({});
    });
  });
});
