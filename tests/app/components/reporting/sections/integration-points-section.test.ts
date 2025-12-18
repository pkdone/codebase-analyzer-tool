import "reflect-metadata";
import { IntegrationPointsSection } from "../../../../../src/app/components/reporting/sections/integration-points/integration-points-section";
import { IntegrationPointsDataProvider } from "../../../../../src/app/components/reporting/sections/integration-points/integration-points-data-provider";
import type { ReportData } from "../../../../../src/app/components/reporting/report-gen.types";

describe("IntegrationPointsSection", () => {
  let section: IntegrationPointsSection;
  let mockIntegrationPointsDataProvider: jest.Mocked<IntegrationPointsDataProvider>;

  beforeEach(() => {
    mockIntegrationPointsDataProvider = {
      getIntegrationPoints: jest.fn(),
    } as unknown as jest.Mocked<IntegrationPointsDataProvider>;

    section = new IntegrationPointsSection(mockIntegrationPointsDataProvider);
  });

  describe("getName", () => {
    it("should return the correct section name", () => {
      expect(section.getName()).toBe("integration-points");
    });
  });

  describe("isStandardSection", () => {
    it("should return true", () => {
      expect(section.isStandardSection()).toBe(true);
    });
  });

  describe("getData", () => {
    it("should fetch integration points from the provider", async () => {
      const mockIntegrationPoints = [
        {
          namespace: "com.example.api",
          filepath: "src/api/controller.ts",
          mechanism: "REST" as const,
          name: "UserController",
          description: "REST API for users",
          path: "/api/users",
          method: "GET",
        },
      ] as any;

      mockIntegrationPointsDataProvider.getIntegrationPoints.mockResolvedValue(
        mockIntegrationPoints,
      );

      const result = await section.getData("test-project");

      expect(result).toEqual({
        integrationPoints: mockIntegrationPoints,
      });
      expect(mockIntegrationPointsDataProvider.getIntegrationPoints).toHaveBeenCalledWith(
        "test-project",
      );
    });
  });

  describe("prepareHtmlData", () => {
    it("should prepare HTML data with table view model", async () => {
      const mockSectionData = {
        integrationPoints: [
          {
            namespace: "com.example.api",
            filepath: "src/api/controller.ts",
            mechanism: "REST" as const,
            name: "UserController",
            description: "REST API",
          },
        ],
      };

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = await section.prepareHtmlData(
        mockReportData as ReportData,
        mockSectionData,
        "/output",
      );

      expect(result).toBeDefined();
      expect(result?.integrationPoints).toEqual(mockSectionData.integrationPoints);
      expect(result?.integrationPointsTableViewModel).toBeDefined();
    });
  });

  describe("prepareJsonData", () => {
    it("should prepare JSON data for integration points", () => {
      const mockSectionData: Partial<ReportData> = {
        integrationPoints: [
          {
            namespace: "com.example.api",
            filepath: "src/api/controller.ts",
            mechanism: "REST" as const,
            name: "UserController",
            description: "REST API for users",
          },
        ],
      };

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = section.prepareJsonData(mockReportData as ReportData, mockSectionData);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe("integration-points.json");
      expect(result[0].data).toEqual(mockSectionData.integrationPoints);
    });

    it("should return empty array when integrationPoints is missing", () => {
      const mockSectionData: Partial<ReportData> = {};

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = section.prepareJsonData(mockReportData as ReportData, mockSectionData);

      expect(result).toHaveLength(0);
    });

    it("should return null when integrationPoints is missing in prepareHtmlData", async () => {
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
