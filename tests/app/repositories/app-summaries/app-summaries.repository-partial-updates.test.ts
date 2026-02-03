import "reflect-metadata";
import { MongoClient, Collection } from "mongodb";
import AppSummaryRepositoryImpl from "../../../../src/app/repositories/app-summaries/app-summaries.repository";
import { PartialAppSummaryRecord } from "../../../../src/app/repositories/app-summaries/app-summaries.model";
import { databaseConfig } from "../../../../src/app/config/database.config";
import * as mdbErrorUtils from "../../../../src/common/mongodb/mdb-error-utils";

// Mock dependencies
jest.mock("../../../../src/common/mongodb/mdb-error-utils");

const mockMdbErrorUtils = mdbErrorUtils as jest.Mocked<typeof mdbErrorUtils>;

describe("AppSummaryRepositoryImpl - Partial Updates", () => {
  let repository: AppSummaryRepositoryImpl;
  let mockMongoClient: jest.Mocked<MongoClient>;
  let mockCollection: jest.Mocked<Collection>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock collection
    mockCollection = {
      updateOne: jest.fn(),
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Collection>;

    // Mock MongoDB client
    mockMongoClient = {
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue(mockCollection),
      }),
      close: jest.fn(),
    } as unknown as jest.Mocked<MongoClient>;

    // Instantiate repository with injected config
    repository = new AppSummaryRepositoryImpl(mockMongoClient, "test-db", databaseConfig);
  });

  describe("createOrReplaceAppSummary - Partial Update Behavior", () => {
    it("should use updateOne with $set instead of replaceOne", async () => {
      const partialRecord: PartialAppSummaryRecord = {
        projectName: "test-project",
        appDescription: "Test application",
        technologies: [{ name: "TypeScript", description: "JavaScript with static types" }],
      };

      mockCollection.updateOne.mockResolvedValue({} as any);

      await repository.createOrReplaceAppSummary(partialRecord);

      // Verify updateOne was called, not replaceOne
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { projectName: partialRecord.projectName },
        { $set: partialRecord },
        { upsert: true },
      );
    });

    it("should preserve existing fields when updating with partial data", async () => {
      const partialRecord: PartialAppSummaryRecord = {
        projectName: "test-project",
        appDescription: "Updated description only",
        // Note: Not including other fields like technologies, entities, etc.
      };

      mockCollection.updateOne.mockResolvedValue({} as any);

      await repository.createOrReplaceAppSummary(partialRecord);

      // The $set operation should only update the provided fields
      const [filter, update, options] = mockCollection.updateOne.mock.calls[0];
      expect(filter).toEqual({ projectName: "test-project" });
      expect(update).toEqual({ $set: partialRecord });
      expect(options).toEqual({ upsert: true });

      // Verify that $set contains only the partial data
      const setOperation = update as { $set: PartialAppSummaryRecord };
      expect(setOperation.$set).toHaveProperty("projectName");
      expect(setOperation.$set).toHaveProperty("appDescription");
      expect(setOperation.$set).not.toHaveProperty("technologies");
      expect(setOperation.$set).not.toHaveProperty("boundedContexts");
    });

    it("should create new document with upsert when document does not exist", async () => {
      const partialRecord: PartialAppSummaryRecord = {
        projectName: "new-project",
        llmProvider: "openai",
      };

      mockCollection.updateOne.mockResolvedValue({ upsertedCount: 1 } as any);

      await repository.createOrReplaceAppSummary(partialRecord);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { projectName: "new-project" },
        { $set: partialRecord },
        { upsert: true },
      );
    });

    it("should update existing document when it already exists", async () => {
      const partialRecord: PartialAppSummaryRecord = {
        projectName: "existing-project",
        technologies: [{ name: "React", description: "UI library" }],
      };

      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 } as any);

      await repository.createOrReplaceAppSummary(partialRecord);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { projectName: "existing-project" },
        { $set: partialRecord },
        { upsert: true },
      );
    });

    it("should handle partial record with only projectName", async () => {
      const partialRecord: PartialAppSummaryRecord = {
        projectName: "minimal-project",
      };

      mockCollection.updateOne.mockResolvedValue({} as any);

      await repository.createOrReplaceAppSummary(partialRecord);

      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { projectName: "minimal-project" },
        { $set: partialRecord },
        { upsert: true },
      );
    });

    it("should handle partial record with multiple fields", async () => {
      const partialRecord: PartialAppSummaryRecord = {
        projectName: "test-project",
        appDescription: "Updated description",
        technologies: [{ name: "Node.ts", description: "JavaScript runtime" }],
        entities: [{ name: "User", description: "User entity" }],
        llmProvider: "openai",
      };

      mockCollection.updateOne.mockResolvedValue({} as any);

      await repository.createOrReplaceAppSummary(partialRecord);

      const [, update] = mockCollection.updateOne.mock.calls[0];
      const setOperation = update as { $set: PartialAppSummaryRecord };
      expect(setOperation.$set).toHaveProperty("appDescription");
      expect(setOperation.$set).toHaveProperty("technologies");
      expect(setOperation.$set).toHaveProperty("technologies");
      expect(setOperation.$set).toHaveProperty("llmProvider");
    });
  });

  describe("Data Loss Prevention", () => {
    it("should not wipe out existing fields when updating with partial data", async () => {
      // Simulate scenario where existing document has many fields,
      // but we only update a few
      const partialRecord: PartialAppSummaryRecord = {
        projectName: "test-project",
        appDescription: "Updated description",
        // Not including: technologies, entities, boundedContexts, etc.
      };

      mockCollection.updateOne.mockResolvedValue({} as any);

      await repository.createOrReplaceAppSummary(partialRecord);

      // Verify that only the provided fields are in the $set operation
      const [, update] = mockCollection.updateOne.mock.calls[0];
      const setOperation = update as { $set: PartialAppSummaryRecord };
      const setFields = Object.keys(setOperation.$set);

      expect(setFields).toContain("projectName");
      expect(setFields).toContain("appDescription");
      expect(setFields).toHaveLength(2); // Only these 2 fields
    });

    it("should allow updating specific categories without affecting others", async () => {
      // This simulates the raw-analyzer use case where only certain
      // categories are updated
      const partialRecord: PartialAppSummaryRecord = {
        projectName: "test-project",
        technologies: [{ name: "TypeScript", description: "JavaScript with types" }],
        // Not updating entities, boundedContexts, or other categories
      };

      mockCollection.updateOne.mockResolvedValue({} as any);

      await repository.createOrReplaceAppSummary(partialRecord);

      const [, update] = mockCollection.updateOne.mock.calls[0];
      const setOperation = update as { $set: PartialAppSummaryRecord };
      expect(setOperation.$set).toHaveProperty("technologies");
      // Should not have categories that weren't provided in the partial update
      expect(setOperation.$set).not.toHaveProperty("boundedContexts");
      expect(setOperation.$set).not.toHaveProperty("potentialMicroservices");
    });
  });

  describe("Error Handling", () => {
    it("should handle MongoDB validation errors during partial update", async () => {
      const partialRecord: PartialAppSummaryRecord = {
        projectName: "test-project",
        appDescription: "Test description",
      };

      const mongoError = new Error("MongoDB validation error");
      mockCollection.updateOne.mockRejectedValue(mongoError);

      await expect(repository.createOrReplaceAppSummary(partialRecord)).rejects.toThrow(mongoError);
      expect(mockMdbErrorUtils.logMongoValidationErrorIfPresent).toHaveBeenCalledWith(mongoError);
    });

    it("should propagate errors from updateOne operation", async () => {
      const partialRecord: PartialAppSummaryRecord = {
        projectName: "test-project",
      };

      const updateError = new Error("Update failed");
      mockCollection.updateOne.mockRejectedValue(updateError);

      await expect(repository.createOrReplaceAppSummary(partialRecord)).rejects.toThrow(
        "Update failed",
      );
    });
  });

  describe("Type Safety", () => {
    it("should accept PartialAppSummaryRecord type", async () => {
      const partialRecord: PartialAppSummaryRecord = {
        projectName: "test-project",
        // Can omit any other fields
      };

      mockCollection.updateOne.mockResolvedValue({} as any);

      // This should compile and run without type errors
      await repository.createOrReplaceAppSummary(partialRecord);

      expect(mockCollection.updateOne).toHaveBeenCalled();
    });

    it("should accept record with all optional fields", async () => {
      const fullRecord: PartialAppSummaryRecord = {
        projectName: "test-project",
        appDescription: "Full description",
        llmProvider: "openai",
        technologies: [{ name: "TypeScript", description: "Typed JavaScript" }],
        boundedContexts: [
          {
            name: "Auth",
            description: "Authentication context",
            aggregates: [
              {
                name: "UserAggregate",
                description: "User aggregate",
                repository: { name: "AuthRepository", description: "Auth repository" },
                entities: [{ name: "User", description: "User entity" }],
              },
            ],
          },
        ],
        businessProcesses: [
          {
            name: "Login",
            description: "User login process",
            keyBusinessActivities: [
              { activity: "Authenticate", description: "Verify credentials" },
            ],
          },
        ],
        potentialMicroservices: [
          {
            name: "Auth",
            description: "Auth microservice",
            entities: [{ name: "User", description: "User entity" }],
            endpoints: [{ path: "/api/auth", method: "POST", description: "Authenticate user" }],
            operations: [
              { operation: "Login", method: "POST", description: "User login operation" },
            ],
          },
        ],
      };

      mockCollection.updateOne.mockResolvedValue({} as any);

      await repository.createOrReplaceAppSummary(fullRecord);

      expect(mockCollection.updateOne).toHaveBeenCalled();
    });
  });
});
