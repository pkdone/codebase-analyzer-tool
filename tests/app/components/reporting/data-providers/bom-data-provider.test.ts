import "reflect-metadata";
import { BomDataProvider } from "../../../../../src/app/components/reporting/sections/dependencies/bom-data-provider";
import type { SourcesRepository } from "../../../../../src/app/repositories/sources/sources.repository.interface";
import type { ProjectedSourceSummaryFields } from "../../../../../src/app/repositories/sources/sources.model";
import type { FileProcessingRulesType } from "../../../../../src/app/config/file-handling";

/**
 * Helper function to create mock source summary data for testing.
 * Uses type assertion since we only need partial data for BOM testing.
 */
function createMockSourceSummary(
  filepath: string,
  dependencies?: { name: string; groupId?: string; version?: string; scope?: string }[],
): ProjectedSourceSummaryFields {
  return {
    filepath,
    summary: dependencies
      ? ({
          dependencies,
          purpose: "test purpose",
          implementation: "test implementation",
        } as ProjectedSourceSummaryFields["summary"])
      : undefined,
  };
}

describe("BomDataProvider", () => {
  let bomDataProvider: BomDataProvider;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockFileProcessingConfig: FileProcessingRulesType;

  beforeEach(() => {
    mockSourcesRepository = {
      getProjectSourcesSummariesByCanonicalType: jest.fn(),
      getProjectSourcesSummariesByFileType: jest.fn(),
      insertSource: jest.fn(),
      deleteSourcesByProject: jest.fn(),
      doesProjectSourceExist: jest.fn(),
      getProjectDatabaseIntegrations: jest.fn(),
      getProjectStoredProceduresAndTriggers: jest.fn(),
      vectorSearchProjectSources: jest.fn(),
      getProjectFilesPaths: jest.fn(),
      getProjectFileAndLineStats: jest.fn(),
      getProjectFileTypesCountAndLines: jest.fn(),
      getProjectIntegrationPoints: jest.fn(),
      getTopComplexFunctions: jest.fn(),
      getCodeSmellStatistics: jest.fn(),
      getCodeQualityStatistics: jest.fn(),
    } as jest.Mocked<SourcesRepository>;

    mockFileProcessingConfig = {
      FOLDER_IGNORE_LIST: ["node_modules", ".git"],
      FILENAME_PREFIX_IGNORE: "test-",
      FILENAME_IGNORE_LIST: ["package-lock.json"],
      BINARY_FILE_EXTENSION_IGNORE_LIST: ["png", "jpg"],
      CODE_FILE_EXTENSIONS: ["ts", "js", "java"],
      BOM_DEPENDENCY_CANONICAL_TYPES: ["maven", "gradle", "npm"],
      SCHEDULED_JOB_CANONICAL_TYPES: ["shell-script"],
    } as unknown as FileProcessingRulesType;

    bomDataProvider = new BomDataProvider(mockSourcesRepository, mockFileProcessingConfig);
  });

  describe("getBillOfMaterials", () => {
    it("should fetch build files using BOM_DEPENDENCY_CANONICAL_TYPES from injected config", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByCanonicalType.mockResolvedValue([]);

      await bomDataProvider.getBillOfMaterials("test-project");

      expect(mockSourcesRepository.getProjectSourcesSummariesByCanonicalType).toHaveBeenCalledWith(
        "test-project",
        expect.arrayContaining([...mockFileProcessingConfig.BOM_DEPENDENCY_CANONICAL_TYPES]),
      );
    });

    it("should return empty result when no build files found", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByCanonicalType.mockResolvedValue([]);

      const result = await bomDataProvider.getBillOfMaterials("test-project");

      expect(result.dependencies).toEqual([]);
      expect(result.totalDependencies).toBe(0);
      expect(result.conflictCount).toBe(0);
      expect(result.buildFiles).toEqual([]);
    });

    it("should aggregate dependencies from multiple build files", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByCanonicalType.mockResolvedValue([
        createMockSourceSummary("pom.xml", [
          { name: "commons-lang3", groupId: "org.apache.commons", version: "3.12.0" },
        ]),
        createMockSourceSummary("package.json", [{ name: "lodash", version: "4.17.21" }]),
      ]);

      const result = await bomDataProvider.getBillOfMaterials("test-project");

      expect(result.totalDependencies).toBe(2);
      expect(result.buildFiles).toContain("pom.xml");
      expect(result.buildFiles).toContain("package.json");
    });

    it("should detect version conflicts", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByCanonicalType.mockResolvedValue([
        createMockSourceSummary("pom.xml", [
          { name: "commons-lang3", groupId: "org.apache.commons", version: "3.12.0" },
        ]),
        createMockSourceSummary("other-pom.xml", [
          { name: "commons-lang3", groupId: "org.apache.commons", version: "3.11.0" },
        ]),
      ]);

      const result = await bomDataProvider.getBillOfMaterials("test-project");

      expect(result.conflictCount).toBe(1);
      const conflictDep = result.dependencies.find((d) => d.name === "commons-lang3");
      expect(conflictDep?.hasConflict).toBe(true);
      expect(conflictDep?.versions).toContain("3.12.0");
      expect(conflictDep?.versions).toContain("3.11.0");
    });

    it("should skip files without dependencies", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByCanonicalType.mockResolvedValue([
        { filepath: "pom.xml", summary: undefined },
        createMockSourceSummary("empty.xml", []),
      ]);

      const result = await bomDataProvider.getBillOfMaterials("test-project");

      expect(result.buildFiles).toEqual([]);
      expect(result.totalDependencies).toBe(0);
    });

    it("should sort dependencies with conflicts first", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByCanonicalType.mockResolvedValue([
        createMockSourceSummary("pom1.xml", [
          { name: "no-conflict", groupId: "com.example", version: "1.0.0" },
          { name: "has-conflict", groupId: "com.example", version: "1.0.0" },
        ]),
        createMockSourceSummary("pom2.xml", [
          { name: "has-conflict", groupId: "com.example", version: "2.0.0" },
        ]),
      ]);

      const result = await bomDataProvider.getBillOfMaterials("test-project");

      expect(result.dependencies[0].hasConflict).toBe(true);
      expect(result.dependencies[0].name).toBe("has-conflict");
    });

    it("should aggregate scopes from dependencies", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByCanonicalType.mockResolvedValue([
        createMockSourceSummary("pom.xml", [
          { name: "junit", groupId: "org.junit", version: "5.0.0", scope: "test" },
          { name: "junit", groupId: "org.junit", version: "5.0.0", scope: "compile" },
        ]),
      ]);

      const result = await bomDataProvider.getBillOfMaterials("test-project");

      const junitDep = result.dependencies.find((d) => d.name === "junit");
      expect(junitDep?.scopes).toContain("test");
      expect(junitDep?.scopes).toContain("compile");
    });

    it("should track dependency locations", async () => {
      mockSourcesRepository.getProjectSourcesSummariesByCanonicalType.mockResolvedValue([
        createMockSourceSummary("module1/pom.xml", [
          { name: "shared-lib", groupId: "com.example", version: "1.0.0" },
        ]),
        createMockSourceSummary("module2/pom.xml", [
          { name: "shared-lib", groupId: "com.example", version: "1.0.0" },
        ]),
      ]);

      const result = await bomDataProvider.getBillOfMaterials("test-project");

      const sharedLib = result.dependencies.find((d) => d.name === "shared-lib");
      expect(sharedLib?.locations).toContain("module1/pom.xml");
      expect(sharedLib?.locations).toContain("module2/pom.xml");
    });
  });
});
