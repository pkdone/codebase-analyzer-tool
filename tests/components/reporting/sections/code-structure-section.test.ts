import "reflect-metadata";
import { CodeStructureSection } from "../../../../src/components/reporting/sections/code-structure-section";
import { CodeStructureDataProvider } from "../../../../src/components/reporting/data-providers/code-structure-data-provider";
import { DependencyTreePngGenerator } from "../../../../src/components/reporting/generators/png/dependency-tree-png-generator";
import type { ReportData } from "../../../../src/components/reporting/report-gen.types";

describe("CodeStructureSection", () => {
  let section: CodeStructureSection;
  let mockCodeStructureDataProvider: jest.Mocked<CodeStructureDataProvider>;
  let mockPngGenerator: jest.Mocked<DependencyTreePngGenerator>;

  beforeEach(() => {
    mockCodeStructureDataProvider = {
      getTopLevelJavaClasses: jest.fn(),
    } as unknown as jest.Mocked<CodeStructureDataProvider>;

    mockPngGenerator = {
      generateHierarchicalDependencyTreePng: jest.fn().mockResolvedValue("class-tree.png"),
    } as unknown as jest.Mocked<DependencyTreePngGenerator>;

    section = new CodeStructureSection(mockCodeStructureDataProvider, mockPngGenerator);
  });

  describe("getName", () => {
    it("should return the correct section name", () => {
      expect(section.getName()).toBe("code-structure");
    });
  });

  describe("getData", () => {
    it("should fetch top-level Java classes from the provider", async () => {
      const mockClasses = [
        {
          namespace: "com.example.Class1",
          dependencies: [{ namespace: "com.example.Class2", dependencies: [] }],
        },
      ];

      mockCodeStructureDataProvider.getTopLevelJavaClasses.mockResolvedValue(mockClasses);

      const result = await section.getData("test-project");

      expect(result).toEqual({ topLevelJavaClasses: mockClasses });
      expect(mockCodeStructureDataProvider.getTopLevelJavaClasses).toHaveBeenCalledWith(
        "test-project",
      );
    });
  });

  describe("prepareHtmlData", () => {
    it("should generate PNG files and create table view model", async () => {
      const mockClasses = [
        {
          namespace: "com.example.Class1",
          dependencies: [{ namespace: "com.example.Class2", dependencies: [] }],
        },
      ];

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = await section.prepareHtmlData(
        mockReportData as ReportData,
        mockClasses,
        "/output",
      );

      expect(result).toBeDefined();
      expect(result?.topLevelJavaClasses).toEqual(mockClasses);
      expect(result?.topLevelJavaClassesTableViewModel).toBeDefined();
      expect(mockPngGenerator.generateHierarchicalDependencyTreePng).toHaveBeenCalled();
    });
  });

  describe("prepareJsonData", () => {
    it("should prepare JSON data for top-level Java classes", () => {
      const mockClasses = [
        {
          namespace: "com.example.Class1",
          dependencies: [],
        },
      ];

      const mockReportData: Partial<ReportData> = {} as ReportData;

      const result = section.prepareJsonData(mockReportData as ReportData, mockClasses);

      expect(result).toHaveLength(1);
      expect(result[0].filename).toBe("top-level-java-classes.json");
      expect(result[0].data).toEqual(mockClasses);
    });
  });
});
