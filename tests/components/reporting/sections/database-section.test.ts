import "reflect-metadata";
import { DatabaseSection } from "../../../../src/components/reporting/sections/database-section";
import { DatabaseReportDataProvider } from "../../../../src/components/reporting/data-providers/database-report-data-provider";
import type { ReportData } from "../../../../src/components/reporting/report-gen.types";

describe("DatabaseSection", () => {
  let section: DatabaseSection;
  let mockDatabaseDataProvider: jest.Mocked<DatabaseReportDataProvider>;

  beforeEach(() => {
    mockDatabaseDataProvider = {
      getDatabaseInteractions: jest.fn(),
      buildProceduresAndTriggersSummary: jest.fn(),
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
      mockDatabaseDataProvider.buildProceduresAndTriggersSummary.mockResolvedValue(
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
      const mockSectionData = {
        dbInteractions: [{ path: "file" }],
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
  });
});
