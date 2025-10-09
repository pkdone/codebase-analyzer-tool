import "reflect-metadata";
import InsightsDataProvider from "../../../src/components/api/mcpServing/insights-data-provider";
import type { AppSummariesRepository } from "../../../src/repositories/app-summary/app-summaries.repository.interface";
import { AppSummaryCategories } from "../../../src/schemas/app-summaries.schema";

describe("InsightsDataProvider", () => {
  let insightsDataProvider: InsightsDataProvider;
  let mockAppSummariesRepository: jest.Mocked<AppSummariesRepository>;
  const testProjectName = "test-project";

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock repository
    mockAppSummariesRepository = {
      getProjectAppSummaryField: jest.fn(),
    } as unknown as jest.Mocked<AppSummariesRepository>;

    insightsDataProvider = new InsightsDataProvider(mockAppSummariesRepository, testProjectName);
  });

  describe("getBusinessProcesses", () => {
    it("should retrieve business processes using the correct category enum value", async () => {
      // Arrange
      const mockBusinessProcesses = [
        {
          name: "User Registration",
          description: "Process for registering new users",
          keyBusinessActivities: [],
        },
        {
          name: "Order Processing",
          description: "Process for handling customer orders",
          keyBusinessActivities: [],
        },
      ];

      mockAppSummariesRepository.getProjectAppSummaryField.mockResolvedValue(mockBusinessProcesses);

      // Act
      const result = await insightsDataProvider.getBusinessProcesses();

      // Assert
      expect(mockAppSummariesRepository.getProjectAppSummaryField).toHaveBeenCalledWith(
        testProjectName,
        AppSummaryCategories.Enum.businessProcesses,
      );
      expect(result).toEqual(mockBusinessProcesses);
    });

    it("should handle null response from repository", async () => {
      // Arrange
      mockAppSummariesRepository.getProjectAppSummaryField.mockResolvedValue(null);

      // Act
      const result = await insightsDataProvider.getBusinessProcesses();

      // Assert
      expect(mockAppSummariesRepository.getProjectAppSummaryField).toHaveBeenCalledWith(
        testProjectName,
        AppSummaryCategories.Enum.businessProcesses,
      );
      expect(result).toBeNull();
    });

    it("should handle empty business processes array", async () => {
      // Arrange
      mockAppSummariesRepository.getProjectAppSummaryField.mockResolvedValue([]);

      // Act
      const result = await insightsDataProvider.getBusinessProcesses();

      // Assert
      expect(mockAppSummariesRepository.getProjectAppSummaryField).toHaveBeenCalledWith(
        testProjectName,
        AppSummaryCategories.Enum.businessProcesses,
      );
      expect(result).toEqual([]);
    });

    it("should use the correct enum value that matches the schema", () => {
      // Assert - Verify that the enum value is correct
      expect(AppSummaryCategories.Enum.businessProcesses).toBe("businessProcesses");
    });
  });
});
