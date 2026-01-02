import "reflect-metadata";
import { CategorizedSectionDataBuilder } from "../../../../../../src/app/components/reporting/sections/shared/categorized-section-data-builder";
import { AppSummaryCategories } from "../../../../../../src/app/schemas/app-summaries.schema";
import type { AppSummaryRecordWithId } from "../../../../../../src/app/repositories/app-summaries/app-summaries.model";

describe("CategorizedSectionDataBuilder", () => {
  let categorizedDataBuilder: CategorizedSectionDataBuilder;

  beforeEach(() => {
    jest.clearAllMocks();
    categorizedDataBuilder = new CategorizedSectionDataBuilder();
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
      const result = categorizedDataBuilder.getStandardSectionData(
        mockAppSummaryData as AppSummaryRecordWithId,
      );

      // Assert - should include technologies, businessProcesses, boundedContexts, potentialMicroservices, inferredArchitecture
      // but NOT appDescription (which is rendered separately in the overview section)
      expect(result).toHaveLength(5);

      // Verify that appDescription is not included (it has a dedicated section)
      const categoryNames = result.map((r) => r.category);
      expect(categoryNames).not.toContain("appDescription");

      // Verify that all standard categories are included
      // boundedContexts is included because DomainModelDataProvider needs it
      expect(categoryNames).toContain("technologies");
      expect(categoryNames).toContain("businessProcesses");
      expect(categoryNames).toContain("boundedContexts");
      expect(categoryNames).toContain("potentialMicroservices");
      expect(categoryNames).toContain("inferredArchitecture");
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
      const result = categorizedDataBuilder.getStandardSectionData(
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
      const result = categorizedDataBuilder.getStandardSectionData(
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
      const result = categorizedDataBuilder.getStandardSectionData(mockAppSummaryData);

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
      const result = categorizedDataBuilder.getStandardSectionData(
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

    it("should correctly filter out only appDescription from categories", () => {
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
      const result = categorizedDataBuilder.getStandardSectionData(
        mockAppSummaryData as AppSummaryRecordWithId,
      );

      // Assert - only appDescription should not be in results (it has a dedicated overview section)
      // boundedContexts IS included because DomainModelDataProvider needs it
      const categoryNames = result.map((r) => r.category);
      expect(categoryNames).not.toContain("appDescription");
      expect(categoryNames).toContain("boundedContexts");
      // Should have all categories minus appDescription only
      expect(result.length).toBe(allCategories.length - 1);
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
