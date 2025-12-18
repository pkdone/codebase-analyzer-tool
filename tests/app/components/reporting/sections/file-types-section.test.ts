import "reflect-metadata";
import { FileTypesSection } from "../../../../../src/app/components/reporting/sections/file-types/file-types-section";
import { SourcesRepository } from "../../../../../src/app/repositories/sources/sources.repository.interface";
import { PieChartGenerator } from "../../../../../src/app/components/reporting/generators/png/pie-chart-generator";
import type { ProjectedFileTypesCountAndLines } from "../../../../../src/app/repositories/sources/sources.model";
import type { ReportData } from "../../../../../src/app/components/reporting/report-gen.types";

describe("FileTypesSection", () => {
  let section: FileTypesSection;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockPieChartGenerator: jest.Mocked<PieChartGenerator>;

  beforeEach(() => {
    mockSourcesRepository = {
      getProjectFileTypesCountAndLines: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    mockPieChartGenerator = {
      generateFileTypesPieChart: jest.fn().mockResolvedValue("chart.png"),
    } as unknown as jest.Mocked<PieChartGenerator>;

    section = new FileTypesSection(mockSourcesRepository, mockPieChartGenerator);
  });

  describe("getName", () => {
    it("should return the correct section name", () => {
      expect(section.getName()).toBe("file-types");
    });
  });

  describe("getData", () => {
    it("should fetch file types data from sources repository", async () => {
      const mockData: ProjectedFileTypesCountAndLines[] = [
        { fileType: "java", files: 10, lines: 1000 },
        { fileType: "xml", files: 5, lines: 500 },
      ];

      mockSourcesRepository.getProjectFileTypesCountAndLines.mockResolvedValue(mockData);

      const result = await section.getData("test-project");

      expect(result).toEqual({ fileTypesData: mockData });
      expect(mockSourcesRepository.getProjectFileTypesCountAndLines).toHaveBeenCalledWith(
        "test-project",
      );
    });
  });

  describe("prepareHtmlData", () => {
    it("should process file types data and generate pie chart", async () => {
      const mockFileTypesData: ProjectedFileTypesCountAndLines[] = [
        { fileType: "java", files: 10, lines: 1000 },
        { fileType: "", files: 5, lines: 500 }, // Empty file type should become "unknown"
      ];

      const mockReportData: Partial<ReportData> = {} as ReportData;
      const mockSectionData: Partial<ReportData> = { fileTypesData: mockFileTypesData };

      const result = await section.prepareHtmlData(
        mockReportData as ReportData,
        mockSectionData,
        "/output",
      );

      expect(result).toBeDefined();
      expect(result?.fileTypesPieChartPath).toBe("charts/chart.png");
      expect(result?.fileTypesData?.[1].fileType).toBe("unknown");
      expect(mockPieChartGenerator.generateFileTypesPieChart).toHaveBeenCalled();
      expect(result?.fileTypesTableViewModel).toBeDefined();
    });
  });

  describe("prepareJsonData", () => {
    it("should prepare JSON data for file types", () => {
      const mockFileTypesData: ProjectedFileTypesCountAndLines[] = [
        { fileType: "java", files: 10, lines: 1000 },
      ];

      const mockReportData: Partial<ReportData> = {} as ReportData;
      const mockSectionData: Partial<ReportData> = { fileTypesData: mockFileTypesData };

      const result = section.prepareJsonData(mockReportData as ReportData, mockSectionData);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe("file-types.json");
      expect(result[0].data).toEqual(mockFileTypesData);
    });
  });
});
