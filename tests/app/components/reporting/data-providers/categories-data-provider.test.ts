import "reflect-metadata";
import { AppSummaryCategoriesProvider } from "../../../../../src/app/components/reporting/sections/file-types/categories-data-provider";
import { AppSummaryCategories } from "../../../../../src/app/schemas/app-summaries.schema";
import type { AppSummaryRecordWithId } from "../../../../../src/app/repositories/app-summaries/app-summaries.model";

describe("AppSummaryCategoriesProvider", () => {
  let categoriesDataProvider: AppSummaryCategoriesProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    categoriesDataProvider = new AppSummaryCategoriesProvider();
  });

  describe("getStandardSectionData", () => {
    it("should return categorized data for all valid categories excluding appDescription and boundedContexts", () => {
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
        boundedContexts: [
          {
            name: "User Management",
            description: "Handles user operations",
            aggregates: [
              {
                name: "User",
                description: "User aggregate",
                repository: { name: "UserRepository", description: "User repository" },
                entities: [{ name: "User", description: "User entity" }],
              },
            ],
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

      // Assert - should include technologies, businessProcesses, potentialMicroservices
      // but NOT appDescription or boundedContexts (which has dedicated visualization)
      expect(result).toHaveLength(3);

      // Verify that categories with custom sections are not included
      const categoryNames = result.map((r) => r.category);
      expect(categoryNames).not.toContain("appDescription");
      expect(categoryNames).not.toContain("boundedContexts"); // Has dedicated domain model visualization

      // Verify that all standard categories are included
      expect(categoryNames).toContain("technologies");
      expect(categoryNames).toContain("businessProcesses");
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

    it("should correctly filter out appDescription and boundedContexts from categories", () => {
      // Arrange - Verify the enum contains appDescription and boundedContexts
      const allCategories = AppSummaryCategories.options;
      expect(allCategories).toContain("appDescription");
      expect(allCategories).toContain("boundedContexts");

      const mockAppSummaryData: Partial<AppSummaryRecordWithId> = {
        technologies: [],
        businessProcesses: [],
        boundedContexts: [],
        potentialMicroservices: [],
      };

      // Act
      const result = categoriesDataProvider.getStandardSectionData(
        mockAppSummaryData as AppSummaryRecordWithId,
      );

      // Assert - appDescription and boundedContexts should not be in results
      const categoryNames = result.map((r) => r.category);
      expect(categoryNames).not.toContain("appDescription");
      expect(categoryNames).not.toContain("boundedContexts");
      // Should have all categories minus appDescription and boundedContexts
      expect(result.length).toBe(allCategories.length - 2);
    });

    it("should not include aggregates, entities, or repositories as separate categories", () => {
      // These are now nested within boundedContexts
      const allCategories = AppSummaryCategories.options;
      expect(allCategories).not.toContain("aggregates");
      expect(allCategories).not.toContain("entities");
      expect(allCategories).not.toContain("repositories");
    });
  });
});
