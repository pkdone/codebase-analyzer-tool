import "reflect-metadata";
import { BomAggregator } from "../../../../src/components/insights/data-aggregators/bom-aggregator";
import { SourcesRepository } from "../../../../src/repositories/sources/sources.repository.interface";

describe("BomAggregator", () => {
  let aggregator: BomAggregator;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSourcesRepository = {
      getProjectSourcesSummaries: jest.fn(),
    } as unknown as jest.Mocked<SourcesRepository>;

    aggregator = new BomAggregator(mockSourcesRepository);
  });

  describe("aggregate", () => {
    it("should aggregate dependencies with conflicts sorted by toSorted (immutable)", async () => {
      const mockSourceFiles = [
        {
          filepath: "pom.xml",
          summary: {
            dependencies: [
              { name: "lib-a", version: "1.0.0" },
              { name: "lib-b", version: "2.0.0" },
            ],
          },
        },
        {
          filepath: "package.json",
          summary: {
            dependencies: [
              { name: "lib-a", version: "1.0.0" },
              { name: "lib-a", version: "2.0.0" }, // Conflict
              { name: "lib-b", version: "1.5.0" }, // Conflict
            ],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregate("test-project");

      expect(result.totalDependencies).toBe(2);
      expect(result.conflictCount).toBe(2);

      // Verify conflicts are sorted first due to toSorted immutability
      const hasConflicts = result.dependencies.filter((d) => d.hasConflict);
      expect(hasConflicts.length).toBe(2);

      // Verify dependencies are sorted by conflict status then name
      expect(result.dependencies[0].hasConflict).toBe(true);
      expect(result.dependencies[1].hasConflict).toBe(true);

      // Verify conflict detection
      const libA = result.dependencies.find((d) => d.name === "lib-a");
      const libB = result.dependencies.find((d) => d.name === "lib-b");

      expect(libA?.hasConflict).toBe(true);
      expect(libA?.versions).toContain("1.0.0");
      expect(libA?.versions).toContain("2.0.0");

      expect(libB?.hasConflict).toBe(true);
      expect(libB?.versions).toContain("1.5.0");
      expect(libB?.versions).toContain("2.0.0");
    });

    it("should handle dependencies without conflicts", async () => {
      const mockSourceFiles = [
        {
          filepath: "package.json",
          summary: {
            dependencies: [
              { name: "express", version: "4.18.0" },
              { name: "lodash", version: "4.17.21" },
            ],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregate("test-project");

      expect(result.totalDependencies).toBe(2);
      expect(result.conflictCount).toBe(0);
      expect(result.dependencies.every((d) => !d.hasConflict)).toBe(true);
    });

    it("should aggregate dependencies from multiple build files", async () => {
      const mockSourceFiles = [
        {
          filepath: "pom.xml",
          summary: {
            dependencies: [
              { name: "spring-core", version: "5.3.0", groupId: "org.springframework" },
            ],
          },
        },
        {
          filepath: "build.gradle",
          summary: {
            dependencies: [
              { name: "spring-core", version: "5.3.0", groupId: "org.springframework" },
            ],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregate("test-project");

      expect(result.buildFiles).toContain("pom.xml");
      expect(result.buildFiles).toContain("build.gradle");
      expect(result.totalDependencies).toBe(1);
    });

    it("should handle empty dependencies", async () => {
      const mockSourceFiles = [
        {
          filepath: "package.json",
          summary: {
            dependencies: [],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregate("test-project");

      expect(result.totalDependencies).toBe(0);
      expect(result.conflictCount).toBe(0);
      expect(result.dependencies).toHaveLength(0);
    });

    it("should sort dependencies with toSorted (immutable sorting)", async () => {
      const mockSourceFiles = [
        {
          filepath: "package.json",
          summary: {
            dependencies: [
              { name: "zebra", version: "1.0.0" },
              { name: "alpha", version: "1.0.0" },
            ],
          },
        },
        {
          filepath: "package-lock.json",
          summary: {
            dependencies: [{ name: "zebra", version: "2.0.0" }],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregate("test-project");

      // Verify toSorted maintains immutability
      const originalArray = result.dependencies;

      // Store the original first element for comparison
      const originalFirst = originalArray[0];

      // Create a new sorted array with a different sort order (alphabetical)
      const alphabeticallySortedArray = originalArray.toSorted((a, b) =>
        a.name.localeCompare(b.name),
      );

      // Verify immutability: original array should not be affected by toSorted
      expect(originalArray[0]).toBe(originalFirst);
      expect(originalArray[0].name).toBe("zebra"); // Conflict first, sorted alphabetically by name within conflicts

      // Alphabetically sorted array should have different order for non-conflicts
      const nonConflictInOriginal = originalArray.find((d) => !d.hasConflict);
      const nonConflictInAlphabetical = alphabeticallySortedArray.find((d) => !d.hasConflict);

      // Verify they are different arrays (reference inequality)
      expect(originalArray).not.toBe(alphabeticallySortedArray);

      // Verify both arrays have the same elements
      if (nonConflictInOriginal) {
        expect(originalArray.length).toBe(alphabeticallySortedArray.length);
        expect(originalArray).toContainEqual(nonConflictInOriginal);
        expect(alphabeticallySortedArray).toContainEqual(nonConflictInAlphabetical!);
      }
    });

    it("should handle dependencies with groupIds correctly", async () => {
      const mockSourceFiles = [
        {
          filepath: "pom.xml",
          summary: {
            dependencies: [
              { name: "artifact1", version: "1.0.0", groupId: "com.example" },
              { name: "artifact2", version: "2.0.0", groupId: "com.example" },
            ],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregate("test-project");

      expect(result.totalDependencies).toBe(2);
      expect(result.dependencies[0].groupId).toBe("com.example");
      expect(result.dependencies[1].groupId).toBe("com.example");
    });

    it("should deduplicate build file paths using Set", async () => {
      const mockSourceFiles = [
        {
          filepath: "pom.xml",
          summary: {
            dependencies: [{ name: "lib-a", version: "1.0.0" }],
          },
        },
        {
          filepath: "pom.xml", // Duplicate filepath
          summary: {
            dependencies: [{ name: "lib-b", version: "2.0.0" }],
          },
        },
        {
          filepath: "build.gradle",
          summary: {
            dependencies: [{ name: "lib-c", version: "3.0.0" }],
          },
        },
      ];

      mockSourcesRepository.getProjectSourcesSummaries.mockResolvedValue(mockSourceFiles as any);

      const result = await aggregator.aggregate("test-project");

      // Verify that duplicate file paths are deduplicated
      expect(result.buildFiles).toHaveLength(2);
      expect(result.buildFiles).toContain("pom.xml");
      expect(result.buildFiles).toContain("build.gradle");
      // Verify pom.xml appears only once despite being in the input twice
      expect(result.buildFiles.filter((f) => f === "pom.xml")).toHaveLength(1);
    });
  });
});
