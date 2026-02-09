import "reflect-metadata";
import { CodeQualitySection } from "../../../../../src/app/components/reporting/sections/code-quality/code-quality-section";
import { CodeQualityDataProvider } from "../../../../../src/app/components/reporting/sections/code-quality/code-quality-data-provider";
import type { ReportData } from "../../../../../src/app/components/reporting/report-data.types";
import type {
  CodeQualitySummaryData,
  DatabaseStatistics,
} from "../../../../../src/app/components/reporting/sections/code-quality/code-quality.types";

/**
 * Creates mock raw code quality summary data (without presentation fields).
 */
function createMockCodeQualitySummaryData(
  overrides: Partial<CodeQualitySummaryData> = {},
): CodeQualitySummaryData {
  return {
    topComplexFunctions: [],
    commonCodeSmells: [],
    overallStatistics: {
      totalFunctions: 0,
      averageComplexity: 0,
      highComplexityCount: 0,
      veryHighComplexityCount: 0,
      averageFunctionLength: 0,
      longFunctionCount: 0,
    },
    ...overrides,
  };
}

/**
 * Creates mock database statistics data for testing.
 */
function createMockDatabaseStatistics(
  overrides: Partial<DatabaseStatistics> = {},
): DatabaseStatistics {
  return {
    storedObjectCounts: { totalProcedures: 236, totalTriggers: 15 },
    ...overrides,
  };
}

describe("CodeQualitySection", () => {
  let section: CodeQualitySection;
  let mockDataProvider: jest.Mocked<CodeQualityDataProvider>;

  beforeEach(() => {
    mockDataProvider = {
      getCodeQualitySummary: jest.fn(),
    } as unknown as jest.Mocked<CodeQualityDataProvider>;

    section = new CodeQualitySection(mockDataProvider);
  });

  describe("prepareHtmlData", () => {
    const mockBaseData = {} as ReportData;

    it("should return null when no code quality data is provided", async () => {
      const result = await section.prepareHtmlData(mockBaseData, {}, "/tmp");

      expect(result).toBeNull();
    });

    it("should add recommendation field to common code smells", async () => {
      const rawData = createMockCodeQualitySummaryData({
        commonCodeSmells: [
          { smellType: "LONG METHOD", occurrences: 10, affectedFiles: 5 },
          { smellType: "God Class", occurrences: 3, affectedFiles: 2 },
          { smellType: "Unknown Smell", occurrences: 1, affectedFiles: 1 },
        ],
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { codeQualitySummary: rawData },
        "/tmp",
      );

      const smells = result?.codeQualitySummary?.commonCodeSmells ?? [];
      expect(smells).toHaveLength(3);

      // Check Long Method recommendation
      expect(smells[0].recommendation).toBe("Refactor into smaller, single-purpose methods");

      // Check God Class recommendation
      expect(smells[1].recommendation).toBe(
        "Split into multiple classes following Single Responsibility Principle",
      );

      // Check default recommendation for unknown smell
      expect(smells[2].recommendation).toBe("Review and refactor as part of modernization effort");
    });

    it("should preserve all raw data fields in the prepared output", async () => {
      const rawData = createMockCodeQualitySummaryData({
        topComplexFunctions: [
          {
            functionName: "complexFunction",
            filePath: "/src/complex.ts",
            complexity: 25,
            linesOfCode: 150,
            codeSmells: ["LONG METHOD"],
          },
        ],
        commonCodeSmells: [{ smellType: "LONG METHOD", occurrences: 5, affectedFiles: 3 }],
        overallStatistics: {
          totalFunctions: 100,
          averageComplexity: 5.5,
          highComplexityCount: 10,
          veryHighComplexityCount: 2,
          averageFunctionLength: 25,
          longFunctionCount: 5,
        },
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { codeQualitySummary: rawData },
        "/tmp",
      );

      const prepared = result?.codeQualitySummary;

      // Verify top complex functions are preserved
      expect(prepared?.topComplexFunctions).toEqual(rawData.topComplexFunctions);

      // Verify overall statistics are preserved
      expect(prepared?.overallStatistics).toEqual(rawData.overallStatistics);

      // Verify common code smells preserve original fields
      expect(prepared?.commonCodeSmells[0].smellType).toBe("LONG METHOD");
      expect(prepared?.commonCodeSmells[0].occurrences).toBe(5);
      expect(prepared?.commonCodeSmells[0].affectedFiles).toBe(3);
    });

    it("should handle empty common code smells array", async () => {
      const rawData = createMockCodeQualitySummaryData({
        commonCodeSmells: [],
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { codeQualitySummary: rawData },
        "/tmp",
      );

      expect(result?.codeQualitySummary?.commonCodeSmells).toEqual([]);
    });

    it("should add recommendations for all supported smell types", async () => {
      const rawData = createMockCodeQualitySummaryData({
        commonCodeSmells: [
          { smellType: "Long Method detected", occurrences: 1, affectedFiles: 1 },
          { smellType: "God Class pattern", occurrences: 1, affectedFiles: 1 },
          { smellType: "Duplicate Code", occurrences: 1, affectedFiles: 1 },
          { smellType: "Long Parameter List", occurrences: 1, affectedFiles: 1 },
          { smellType: "Complex Conditional", occurrences: 1, affectedFiles: 1 },
        ],
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { codeQualitySummary: rawData },
        "/tmp",
      );

      const smells = result?.codeQualitySummary?.commonCodeSmells ?? [];

      expect(smells[0].recommendation).toBe("Refactor into smaller, single-purpose methods");
      expect(smells[1].recommendation).toBe(
        "Split into multiple classes following Single Responsibility Principle",
      );
      expect(smells[2].recommendation).toBe(
        "Extract common code into reusable functions or utilities",
      );
      expect(smells[3].recommendation).toBe("Use parameter objects or builder pattern");
      expect(smells[4].recommendation).toBe("Simplify conditionals or extract into guard clauses");
    });
  });

  describe("databaseStatistics passthrough", () => {
    const mockBaseData = {} as ReportData;

    it("should pass through databaseStatistics when present", async () => {
      const dbStats = createMockDatabaseStatistics();
      const rawData = createMockCodeQualitySummaryData({
        databaseStatistics: dbStats,
      });

      const result = await section.prepareHtmlData(
        mockBaseData,
        { codeQualitySummary: rawData },
        "/tmp",
      );

      expect(result?.codeQualitySummary?.databaseStatistics).toEqual(dbStats);
    });

    it("should not include databaseStatistics when not present in raw data", async () => {
      const rawData = createMockCodeQualitySummaryData();

      const result = await section.prepareHtmlData(
        mockBaseData,
        { codeQualitySummary: rawData },
        "/tmp",
      );

      expect(result?.codeQualitySummary?.databaseStatistics).toBeUndefined();
    });

    it("should include databaseStatistics in JSON output when present", () => {
      const dbStats = createMockDatabaseStatistics();
      const rawData = createMockCodeQualitySummaryData({
        databaseStatistics: dbStats,
      });

      const result = section.prepareJsonData({} as ReportData, { codeQualitySummary: rawData });

      expect(result).toHaveLength(1);
      const jsonData = result[0].data as CodeQualitySummaryData;
      expect(jsonData.databaseStatistics).toEqual(dbStats);
    });
  });

  describe("prepareJsonData", () => {
    const mockBaseData = {} as ReportData;

    it("should return raw data for JSON output (without recommendations)", () => {
      const rawData = createMockCodeQualitySummaryData({
        commonCodeSmells: [{ smellType: "LONG METHOD", occurrences: 5, affectedFiles: 3 }],
      });

      const result = section.prepareJsonData(mockBaseData, { codeQualitySummary: rawData });

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe("code-quality-summary.json");

      // JSON output should contain raw data without presentation fields
      const jsonData = result[0].data as CodeQualitySummaryData;
      expect(jsonData.commonCodeSmells[0]).not.toHaveProperty("recommendation");
    });

    it("should return empty array when no code quality data", () => {
      const result = section.prepareJsonData(mockBaseData, {});

      expect(result).toEqual([]);
    });
  });

  describe("getName", () => {
    it("should return the correct section name", () => {
      expect(section.getName()).toBe("code-quality");
    });
  });

  describe("getRequiredAppSummaryFields", () => {
    it("should return empty array as no app summary fields are required", () => {
      expect(section.getRequiredAppSummaryFields()).toEqual([]);
    });
  });
});
