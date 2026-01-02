import "reflect-metadata";
import { DatabaseSection } from "../../../../../src/app/components/reporting/sections/database/database-section";
import { DatabaseReportDataProvider } from "../../../../../src/app/components/reporting/sections/database/database-report-data-provider";
import type { ReportData } from "../../../../../src/app/components/reporting/report-data.types";

describe("DatabaseSection", () => {
  let section: DatabaseSection;
  let mockDatabaseDataProvider: jest.Mocked<DatabaseReportDataProvider>;

  beforeEach(() => {
    mockDatabaseDataProvider = {
      getDatabaseInteractions: jest.fn(),
      getStoredProceduresAndTriggers: jest.fn(),
    } as unknown as jest.Mocked<DatabaseReportDataProvider>;

    section = new DatabaseSection(mockDatabaseDataProvider);
  });

  describe("getName", () => {
    it("should return the correct section name", () => {
      expect(section.getName()).toBe("database");
    });
  });

  describe("getData", () => {
    it("should fetch database data from the provider", async () => {
      const mockDbInteractions = [
        {
          path: "file",
          mechanism: "JDBC",
          description: "test",
          codeExample: "test",
        },
      ];
      const mockProcsAndTriggers = {
        procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
      };

      mockDatabaseDataProvider.getDatabaseInteractions.mockResolvedValue(mockDbInteractions);
      mockDatabaseDataProvider.getStoredProceduresAndTriggers.mockResolvedValue(
        mockProcsAndTriggers,
      );

      const result = await section.getData("test-project");

      expect(result).toEqual({
        dbInteractions: mockDbInteractions,
        procsAndTriggers: mockProcsAndTriggers,
      });
    });
  });

  describe("prepareHtmlData", () => {
    it("should prepare HTML data with table view models", async () => {
      const mockSectionData = {
        dbInteractions: [
          {
            path: "file",
            mechanism: "JDBC",
            description: "test",
            codeExample: "test",
          },
        ],
        procsAndTriggers: {
          procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
          trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        },
      };

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = await section.prepareHtmlData(
        mockReportData as ReportData,
        mockSectionData,
        "/output",
      );

      expect(result).toBeDefined();
      expect(result?.dbInteractions).toEqual(mockSectionData.dbInteractions);
      expect(result?.procsAndTriggers).toEqual(mockSectionData.procsAndTriggers);
      expect(result?.dbInteractionsTableViewModel).toBeDefined();
      expect(result?.procsAndTriggersTableViewModel).toBeDefined();
    });
  });

  describe("prepareJsonData", () => {
    it("should prepare JSON data for all database sections", () => {
      const mockSectionData: Partial<ReportData> = {
        dbInteractions: [
          {
            path: "file",
            mechanism: "JDBC",
            description: "test",
            codeExample: "test",
          },
        ],
        procsAndTriggers: {
          procs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
          trigs: { total: 0, low: 0, medium: 0, high: 0, list: [] },
        },
      };

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = section.prepareJsonData(mockReportData as ReportData, mockSectionData);

      expect(result).toHaveLength(2);
      expect(result[0].filename).toBe("db-interactions.json");
      expect(result[1].filename).toBe("procs-and-triggers.json");
    });

    it("should return empty array when required fields are missing", () => {
      const mockSectionData: Partial<ReportData> = {};

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = section.prepareJsonData(mockReportData as ReportData, mockSectionData);

      expect(result).toHaveLength(0);
    });

    it("should return null when required fields are missing in prepareHtmlData", async () => {
      const mockSectionData: Partial<ReportData> = {};

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = await section.prepareHtmlData(
        mockReportData as ReportData,
        mockSectionData,
        "/output",
      );

      expect(result).toBeNull();
    });
  });
});
