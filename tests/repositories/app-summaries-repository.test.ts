import "reflect-metadata";
import { MongoClient, Collection } from "mongodb";
import AppSummariesRepositoryImpl from "../../src/repositories/app-summary/app-summaries.repository";
import {
  AppSummaryRecord,
  PartialAppSummaryRecord,
} from "../../src/repositories/app-summary/app-summaries.model";
import { databaseConfig } from "../../src/config/database.config";
import * as mdbErrorUtils from "../../src/common/mdb/mdb-error-utils";

// Mock dependencies
jest.mock("../../src/common/mdb/mdb-error-utils");

const mockMdbErrorUtils = mdbErrorUtils as jest.Mocked<typeof mdbErrorUtils>;

describe("AppSummariesRepositoryImpl", () => {
  let repository: AppSummariesRepositoryImpl;
  let mockMongoClient: jest.Mocked<MongoClient>;
  let mockCollection: jest.Mocked<Collection>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock collection
    mockCollection = {
      replaceOne: jest.fn(),
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

    repository = new AppSummariesRepositoryImpl(mockMongoClient, "test-db");
  });

  describe("createOrReplaceAppSummary", () => {
    it("should replace an app summary record with upsert", async () => {
      const mockRecord: AppSummaryRecord = {
        projectName: "test-project",
        appDescription: "Test application",
        llmProvider: "openai",
        technologies: [
          { name: "TypeScript", description: "JavaScript with static types" },
          { name: "Node.js", description: "JavaScript runtime for server-side development" },
        ],
        entities: [{ name: "User", description: "User management entity" }],
      };

      mockCollection.replaceOne.mockResolvedValue({} as any);

      await repository.createOrReplaceAppSummary(mockRecord);

      expect(mockCollection.replaceOne).toHaveBeenCalledWith(
        { projectName: mockRecord.projectName },
        mockRecord,
        { upsert: true },
      );
    });

    it("should handle MongoDB validation errors during replace", async () => {
      const mockRecord: AppSummaryRecord = {
        projectName: "test-project",
        appDescription: "Test application",
        llmProvider: "openai",
      };

      const mongoError = new Error("MongoDB validation error");
      mockCollection.replaceOne.mockRejectedValue(mongoError);

      await expect(repository.createOrReplaceAppSummary(mockRecord)).rejects.toThrow(mongoError);
      expect(mockMdbErrorUtils.logMongoValidationErrorIfPresent).toHaveBeenCalledWith(mongoError);
    });
  });

  describe("updateAppSummary", () => {
    it("should update specific fields using $set", async () => {
      const projectName = "test-project";
      const updates: PartialAppSummaryRecord = {
        appDescription: "Updated description",
        technologies: [
          { name: "TypeScript", description: "JavaScript with static types" },
          { name: "React", description: "JavaScript library for building user interfaces" },
        ],
      };

      mockCollection.updateOne.mockResolvedValue({} as any);

      await repository.updateAppSummary(projectName, updates);

      expect(mockCollection.updateOne).toHaveBeenCalledWith({ projectName }, { $set: updates });
    });

    it("should handle MongoDB validation errors during update", async () => {
      const projectName = "test-project";
      const updates: PartialAppSummaryRecord = {
        appDescription: "Updated description",
      };

      const mongoError = new Error("Update validation error");
      mockCollection.updateOne.mockRejectedValue(mongoError);

      await expect(repository.updateAppSummary(projectName, updates)).rejects.toThrow(mongoError);
      expect(mockMdbErrorUtils.logMongoValidationErrorIfPresent).toHaveBeenCalledWith(mongoError);
    });

    it("should handle empty updates object", async () => {
      const projectName = "test-project";
      const updates: PartialAppSummaryRecord = {};

      mockCollection.updateOne.mockResolvedValue({} as any);

      await repository.updateAppSummary(projectName, updates);

      expect(mockCollection.updateOne).toHaveBeenCalledWith({ projectName }, { $set: {} });
    });
  });

  describe("getProjectAppSummaryFields for appDescription and llmProvider", () => {
    it("should return projected fields when record exists", async () => {
      const projectName = "test-project";
      const mockResult = {
        appDescription: "Test application",
        llmProvider: "openai",
      };

      mockCollection.findOne.mockResolvedValue(mockResult);

      const result = await repository.getProjectAppSummaryFields(projectName, ["appDescription", "llmProvider"]);

      expect(result).toEqual(mockResult);
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { projectName },
        {
          projection: { _id: 0, appDescription: 1, llmProvider: 1 },
        },
      );
    });

    it("should return null when record does not exist", async () => {
      const projectName = "nonexistent-project";
      mockCollection.findOne.mockResolvedValue(null);

      const result = await repository.getProjectAppSummaryFields(projectName, ["appDescription", "llmProvider"]);

      expect(result).toBeNull();
    });
  });

  describe("getProjectAppSummaryField", () => {
    it("should return specific field value when record exists", async () => {
      const projectName = "test-project";
      const fieldName = "appDescription";
      const mockRecord = {
        appDescription: "Test application description",
      };

      // Mock the getProjectAppSummaryFields method indirectly through findOne
      mockCollection.findOne.mockResolvedValue(mockRecord);

      const result = await repository.getProjectAppSummaryField(projectName, fieldName);

      expect(result).toBe("Test application description");
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { projectName },
        {
          projection: { _id: 0, [fieldName]: 1 },
        },
      );
    });

    it("should return null when field does not exist", async () => {
      const projectName = "test-project";
      const fieldName = "nonexistentField" as keyof AppSummaryRecord;

      mockCollection.findOne.mockResolvedValue(null);

      const result = await repository.getProjectAppSummaryField(projectName, fieldName);

      expect(result).toBeNull();
    });

    it("should return null when record exists but field is undefined", async () => {
      const projectName = "test-project";
      const fieldName = "appDescription";

      mockCollection.findOne.mockResolvedValue({});

      const result = await repository.getProjectAppSummaryField(projectName, fieldName);

      expect(result).toBeNull();
    });
  });

  describe("getProjectAppSummaryFields", () => {
    it("should return multiple fields when record exists", async () => {
      const projectName = "test-project";
      const fieldNames = [
        "appDescription",
        "llmProvider",
        "technologies",
      ] as (keyof AppSummaryRecord)[];
      const mockRecord = {
        appDescription: "Test application",
        llmProvider: "openai",
        technologies: [
          { name: "TypeScript", description: "JavaScript with static types" },
          { name: "Node.js", description: "JavaScript runtime" },
        ],
      };

      mockCollection.findOne.mockResolvedValue(mockRecord);

      const result = await repository.getProjectAppSummaryFields(projectName, fieldNames);

      expect(result).toEqual(mockRecord);
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { projectName },
        {
          projection: {
            _id: 0,
            appDescription: 1,
            llmProvider: 1,
            technologies: 1,
          },
        },
      );
    });

    it("should return null when no fields requested", async () => {
      const projectName = "test-project";
      const fieldNames: string[] = [];

      const result = await repository.getProjectAppSummaryFields(projectName, fieldNames as any);

      expect(result).toBeNull();
      expect(mockCollection.findOne).not.toHaveBeenCalled();
    });

    it("should return null when record does not exist", async () => {
      const projectName = "nonexistent-project";
      const fieldNames = ["appDescription", "llmProvider"] as (keyof AppSummaryRecord)[];

      mockCollection.findOne.mockResolvedValue(null);

      const result = await repository.getProjectAppSummaryFields(projectName, fieldNames);

      expect(result).toBeNull();
    });

    it("should construct correct projection for single field", async () => {
      const projectName = "test-project";
      const fieldNames = ["appDescription"] as (keyof AppSummaryRecord)[];
      const mockRecord = { appDescription: "Test app" };

      mockCollection.findOne.mockResolvedValue(mockRecord);

      await repository.getProjectAppSummaryFields(projectName, fieldNames);

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { projectName },
        {
          projection: {
            _id: 0,
            appDescription: 1,
          },
        },
      );
    });

    it("should handle partial records where some requested fields are missing", async () => {
      const projectName = "test-project";
      const fieldNames = [
        "appDescription",
        "llmProvider",
        "technologies",
      ] as (keyof AppSummaryRecord)[];
      const mockRecord = {
        appDescription: "Test application",
        // llmProvider is missing
        technologies: [{ name: "TypeScript", description: "JavaScript with static types" }],
      };

      mockCollection.findOne.mockResolvedValue(mockRecord);

      const result = await repository.getProjectAppSummaryFields(projectName, fieldNames);

      expect(result).toEqual({
        appDescription: "Test application",
        technologies: [{ name: "TypeScript", description: "JavaScript with static types" }],
      });
    });
  });

  describe("projection building", () => {
    it("should build correct projection object for multiple fields", async () => {
      const projectName = "test-project";
      const fieldNames = [
        "appDescription",
        "technologies",
        "entities",
        "llmProvider",
      ] as (keyof AppSummaryRecord)[];

      mockCollection.findOne.mockResolvedValue({});

      await repository.getProjectAppSummaryFields(projectName, fieldNames);

      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { projectName },
        {
          projection: {
            _id: 0,
            appDescription: 1,
            technologies: 1,
            entities: 1,
            llmProvider: 1,
          },
        },
      );
    });

    it("should always exclude _id field in projections", async () => {
      const projectName = "test-project";
      const fieldNames = ["appDescription"] as (keyof AppSummaryRecord)[];

      mockCollection.findOne.mockResolvedValue({});

      await repository.getProjectAppSummaryFields(projectName, fieldNames);

      const projectionCall = mockCollection.findOne.mock.calls[0][1];
      expect(projectionCall?.projection).toHaveProperty("_id", 0);
    });
  });

  describe("getCollectionValidationSchema", () => {
    it("should return the JSON schema", () => {
      const result = repository.getCollectionValidationSchema();

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });
  });

  describe("constructor", () => {
    it("should initialize with correct collection name", () => {
      const dbMock = mockMongoClient.db();
      expect(dbMock.collection).toHaveBeenCalledWith(databaseConfig.SUMMARIES_COLLECTION_NAME);
    });
  });
});
