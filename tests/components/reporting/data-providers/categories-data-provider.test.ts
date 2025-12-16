import "reflect-metadata";
import { AppSummaryCategoriesProvider } from "../../../../src/components/reporting/data-providers/categories-data-provider";
import { AppSummaryCategories } from "../../../../src/schemas/app-summaries.schema";
import type { AppSummaryRecordWithId } from "../../../../src/repositories/app-summaries/app-summaries.model";

describe("AppSummaryCategoriesProvider", () => {
  let categoriesDataProvider: AppSummaryCategoriesProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock report sections - include AdvancedDataSection with custom rendering
    const mockSections = [
      {
        getName: () => "file-types",
        isStandardSection: () => true,
      },
      {
        getName: () => "database",
        isStandardSection: () => true,
      },
      {
        getName: () => "advanced-data",
        isStandardSection: () => false, // This section has custom rendering
      },
    ];
    categoriesDataProvider = new AppSummaryCategoriesProvider(mockSections as any);
  });

  describe("getStandardSectionData", () => {
    it("should return categorized data for all valid categories excluding appDescription", () => {
      // Arrange
      const mockAppSummaryData: Partial<AppSummaryRecordWithId> = {
        technologies: [
          { name: "Node.ts", description: "JavaScript runtime" },
          { name: "MongoDB", description: "NoSQL database" },
        ],
        businessProcesses: [
          {
            name: "User Registration",
            description: "Process for registering new users",
            keyBusinessActivities: [],
          },
        ],
        boundedContexts: [{ name: "User Management", description: "Handles user operations" }],
        aggregates: [
          {
            name: "User",
            description: "User aggregate",
            entities: ["UserProfile"],
            repository: "UserRepository",
          },
        ],
        entities: [{ name: "User", description: "User entity" }],
        repositories: [
          {
            name: "UserRepository",
            description: "Repository for user data",
            aggregate: "User",
          },
        ],
        potentialMicroservices: [
          {
            name: "UserService",
            description: "Microservice for user management",
            entities: [],
            endpoints: [],
            operations: [],
          },
        ],
      };

      // Act
      const result = categoriesDataProvider.getStandardSectionData(
        mockAppSummaryData as AppSummaryRecordWithId,
      );

      // Assert
      expect(result).toHaveLength(7); // All categories except those with custom sections (appDescription, billOfMaterials, codeQualitySummary, scheduledJobsSummary, moduleCoupling, uiTechnologyAnalysis)

      // Verify that categories with custom sections are not included
      const categoryNames = result.map((r) => r.category);
      expect(categoryNames).not.toContain("appDescription");
      expect(categoryNames).not.toContain("billOfMaterials");
      expect(categoryNames).not.toContain("codeQualitySummary");
      expect(categoryNames).not.toContain("scheduledJobsSummary");
      expect(categoryNames).not.toContain("moduleCoupling");
      expect(categoryNames).not.toContain("uiTechnologyAnalysis");

      // Verify that all generic categories are included
      expect(categoryNames).toContain("technologies");
      expect(categoryNames).toContain("businessProcesses");
      expect(categoryNames).toContain("boundedContexts");
      expect(categoryNames).toContain("aggregates");
      expect(categoryNames).toContain("entities");
      expect(categoryNames).toContain("repositories");
      expect(categoryNames).toContain("potentialMicroservices");
    });

    it("should return valid data for categories with data", () => {
      // Arrange
      const mockTechnologies = [
        { name: "TypeScript", description: "Typed JavaScript" },
        { name: "Express", description: "Web framework" },
      ];

      const mockAppSummaryData: Partial<AppSummaryRecordWithId> = {
        technologies: mockTechnologies,
        businessProcesses: [],
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
        potentialMicroservices: [],
      };

      // Act
      const result = categoriesDataProvider.getStandardSectionData(
        mockAppSummaryData as AppSummaryRecordWithId,
      );

      // Assert
      const technologiesResult = result.find((r) => r.category === "technologies");
      expect(technologiesResult).toBeDefined();
      expect(technologiesResult?.data).toEqual(mockTechnologies);
      expect(technologiesResult?.label).toBe("Technologies");
    });

    it("should handle missing or undefined category data gracefully", () => {
      // Arrange - Provide minimal data
      const mockAppSummaryData: Partial<AppSummaryRecordWithId> = {
        technologies: undefined,
        businessProcesses: undefined,
        boundedContexts: undefined,
        aggregates: undefined,
        entities: undefined,
        repositories: undefined,
        potentialMicroservices: undefined,
      };

      // Act
      const result = categoriesDataProvider.getStandardSectionData(
        mockAppSummaryData as AppSummaryRecordWithId,
      );

      // Assert - All categories should return empty arrays
      result.forEach((category) => {
        expect(category.data).toEqual([]);
      });
    });

    it("should handle non-array data by returning empty array", () => {
      // Arrange - Provide invalid data types
      const mockAppSummaryData = {
        technologies: "invalid data",
        businessProcesses: 123,
        boundedContexts: null,
        aggregates: {},
        entities: false,
        repositories: undefined,
        potentialMicroservices: "not an array",
      } as unknown as AppSummaryRecordWithId;

      // Act
      const result = categoriesDataProvider.getStandardSectionData(mockAppSummaryData);

      // Assert - All invalid data should be converted to empty arrays
      result.forEach((category) => {
        expect(category.data).toEqual([]);
      });
    });

    it("should maintain proper category order and structure", () => {
      // Arrange
      const mockAppSummaryData: Partial<AppSummaryRecordWithId> = {
        technologies: [{ name: "Test", description: "Test tech" }],
        businessProcesses: [],
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
        potentialMicroservices: [],
      };

      // Act
      const result = categoriesDataProvider.getStandardSectionData(
        mockAppSummaryData as AppSummaryRecordWithId,
      );

      // Assert - Check structure of each result
      result.forEach((category) => {
        expect(category).toHaveProperty("category");
        expect(category).toHaveProperty("label");
        expect(category).toHaveProperty("data");
        expect(typeof category.category).toBe("string");
        expect(typeof category.label).toBe("string");
        expect(Array.isArray(category.data)).toBe(true);
      });
    });

    it("should correctly filter out appDescription from categories", () => {
      // Arrange - Verify the enum contains appDescription
      const allCategories = AppSummaryCategories.options;
      expect(allCategories).toContain("appDescription");

      const mockAppSummaryData: Partial<AppSummaryRecordWithId> = {
        technologies: [],
        businessProcesses: [],
        boundedContexts: [],
        aggregates: [],
        entities: [],
        repositories: [],
        potentialMicroservices: [],
      };

      // Act
      const result = categoriesDataProvider.getStandardSectionData(
        mockAppSummaryData as AppSummaryRecordWithId,
      );

      // Assert - categories with custom sections should not be in results
      const categoryNames = result.map((r) => r.category);
      expect(categoryNames).not.toContain("appDescription");
      // billOfMaterials, codeQualitySummary, scheduledJobsSummary, moduleCoupling, uiTechnologyAnalysis
      // are no longer in AppSummaryCategories, so they won't appear anyway
      expect(result.length).toBe(allCategories.length - 1); // All categories minus appDescription
    });
  });
});
