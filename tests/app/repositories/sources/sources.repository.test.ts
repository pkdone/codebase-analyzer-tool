import "reflect-metadata";
import { MongoClient, Collection, AggregationCursor, FindCursor } from "mongodb";
import { Double } from "bson";
import SourcesRepositoryImpl from "../../../../src/app/repositories/sources/sources.repository";
import { SourceRecord } from "../../../../src/app/repositories/sources/sources.model";
import { databaseConfig } from "../../../../src/app/components/database/database.config";
import * as logging from "../../../../src/common/utils/logging";
import * as mdbErrorUtils from "../../../../src/common/mongodb/mdb-error-utils";

// Mock dependencies
jest.mock("../../../../src/common/utils/logging");
jest.mock("../../../../src/common/mongodb/mdb-error-utils");

const mockLogging = logging as jest.Mocked<typeof logging>;
const mockMdbErrorUtils = mdbErrorUtils as jest.Mocked<typeof mdbErrorUtils>;

describe("SourcesRepositoryImpl", () => {
  let repository: SourcesRepositoryImpl;
  let mockMongoClient: jest.Mocked<MongoClient>;
  let mockCollection: jest.Mocked<Collection>;
  let mockAggregationCursor: jest.Mocked<AggregationCursor>;
  let mockFindCursor: jest.Mocked<FindCursor>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock cursors
    mockAggregationCursor = {
      toArray: jest.fn(),
    } as unknown as jest.Mocked<AggregationCursor>;

    mockFindCursor = {
      toArray: jest.fn(),
      map: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<FindCursor>;

    // Mock collection
    mockCollection = {
      insertOne: jest.fn(),
      deleteMany: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn().mockReturnValue(mockFindCursor),
      aggregate: jest.fn().mockReturnValue(mockAggregationCursor),
      replaceOne: jest.fn(),
      updateOne: jest.fn(),
    } as unknown as jest.Mocked<Collection>;

    // Mock MongoDB client
    mockMongoClient = {
      db: jest.fn().mockReturnValue({
        collection: jest.fn().mockReturnValue(mockCollection),
      }),
      close: jest.fn(),
    } as unknown as jest.Mocked<MongoClient>;

    repository = new SourcesRepositoryImpl(mockMongoClient, "test-db");
  });

  describe("insertSource", () => {
    it("should insert a source record successfully", async () => {
      const mockSourceRecord: SourceRecord = {
        projectName: "test-project",
        filename: "test.ts",
        filepath: "src/test.ts",
        fileType: "ts",
        linesCount: 10,
        content: "console.log('test');",
        summary: {
          namespace: "Test",
          purpose: "Testing",
          implementation: "This is a test implementation for testing purposes.",
        },
      };

      mockCollection.insertOne.mockResolvedValue({} as any);

      await repository.insertSource(mockSourceRecord);

      expect(mockCollection.insertOne).toHaveBeenCalledWith(mockSourceRecord);
    });

    it("should handle MongoDB validation errors", async () => {
      const mockSourceRecord: SourceRecord = {
        projectName: "test-project",
        filename: "test.ts",
        filepath: "src/test.ts",
        fileType: "ts",
        linesCount: 10,
        content: "console.log('test');",
      };

      const mongoError = new Error("MongoDB validation error");
      mockCollection.insertOne.mockRejectedValue(mongoError);

      await expect(repository.insertSource(mockSourceRecord)).rejects.toThrow(mongoError);
      expect(mockMdbErrorUtils.logMongoValidationErrorIfPresent).toHaveBeenCalledWith(mongoError);
    });
  });

  describe("deleteSourcesByProject", () => {
    it("should delete all sources for a project", async () => {
      const projectName = "test-project";
      mockCollection.deleteMany.mockResolvedValue({} as any);

      await repository.deleteSourcesByProject(projectName);

      expect(mockCollection.deleteMany).toHaveBeenCalledWith({ projectName });
    });
  });

  describe("doesProjectSourceExist", () => {
    it("should return true when source exists", async () => {
      const projectName = "test-project";
      const filepath = "src/test.ts";
      mockCollection.findOne.mockResolvedValue({ _id: "some-id" });

      const result = await repository.doesProjectSourceExist(projectName, filepath);

      expect(result).toBe(true);
      expect(mockCollection.findOne).toHaveBeenCalledWith(
        { projectName, filepath },
        { projection: { _id: 1 } },
      );
    });

    it("should return false when source does not exist", async () => {
      const projectName = "test-project";
      const filepath = "src/test.ts";
      mockCollection.findOne.mockResolvedValue(null);

      const result = await repository.doesProjectSourceExist(projectName, filepath);

      expect(result).toBe(false);
    });
  });

  describe("vectorSearchProjectSourcesRawContent", () => {
    it("should construct correct aggregation pipeline", async () => {
      const projectName = "test-project";
      const queryVector = [1.0, 2.0, 3.0];
      const numCandidates = 100;
      const limit = 10;

      const mockResults = [
        {
          projectName,
          filepath: "src/test.ts",
          fileType: "ts",
          content: "test content",
          summary: { namespace: "Test" },
        },
      ];

      mockAggregationCursor.toArray.mockResolvedValue(mockResults);

      const result = await repository.vectorSearchProjectSourcesRawContent(
        projectName,
        queryVector,
        numCandidates,
        limit,
      );

      // Verify the pipeline structure
      const expectedPipeline = [
        {
          $vectorSearch: {
            index: databaseConfig.CONTENT_VECTOR_INDEX_NAME,
            path: databaseConfig.CONTENT_VECTOR_FIELD,
            filter: {
              projectName: { $eq: projectName },
            },
            queryVector: [new Double(1.0), new Double(2.0), new Double(3.0)],
            numCandidates,
            limit,
          },
        },
        {
          $project: {
            _id: 0,
            projectName: 1,
            filepath: 1,
            fileType: 1,
            content: 1,
            summary: 1,
          },
        },
      ];

      expect(mockCollection.aggregate).toHaveBeenCalledWith(expectedPipeline);
      expect(result).toEqual(mockResults);
    });

    it("should convert number array to BSON Doubles", async () => {
      const queryVector = [1.5, 2.7, 3.14];
      const mockResults: any[] = [];

      mockAggregationCursor.toArray.mockResolvedValue(mockResults);

      await repository.vectorSearchProjectSourcesRawContent("test-project", queryVector, 100, 10);

      // Verify that aggregate was called with the expected pipeline structure
      expect(mockCollection.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $vectorSearch: expect.objectContaining({
              queryVector: [new Double(1.5), new Double(2.7), new Double(3.14)],
            }),
          }),
        ]),
      );
    });

    it("should handle MongoDB vector search errors", async () => {
      const mongoError = new Error("Vector search index not found");
      mockCollection.aggregate.mockReturnValue({
        toArray: jest.fn().mockRejectedValue(mongoError),
      } as any);

      await expect(
        repository.vectorSearchProjectSourcesRawContent("test", [1, 2, 3], 100, 10),
      ).rejects.toThrow(mongoError);

      expect(mockLogging.logOneLineError).toHaveBeenCalledWith(
        expect.stringContaining("Problem performing Atlas Vector Search aggregation"),
        mongoError,
      );
    });
  });

  describe("aggregation methods", () => {
    describe("getProjectFileAndLineStats", () => {
      it("should return correct stats when files exist", async () => {
        const projectName = "test-project";
        const mockResults = [{ fileCount: 42, linesOfCode: 1500 }];
        mockAggregationCursor.toArray.mockResolvedValue(mockResults);

        const result = await repository.getProjectFileAndLineStats(projectName);

        expect(result).toEqual({ fileCount: 42, linesOfCode: 1500 });

        const expectedPipeline = [
          { $match: { projectName } },
          {
            $group: {
              _id: null,
              fileCount: { $sum: 1 },
              linesOfCode: { $sum: "$linesCount" },
            },
          },
        ];
        expect(mockCollection.aggregate).toHaveBeenCalledWith(expectedPipeline);
      });

      it("should return zeros when no files exist", async () => {
        const projectName = "test-project";
        mockAggregationCursor.toArray.mockResolvedValue([]);

        const result = await repository.getProjectFileAndLineStats(projectName);

        expect(result).toEqual({ fileCount: 0, linesOfCode: 0 });
      });

      it("should use array destructuring to safely extract first element", async () => {
        const projectName = "test-project";
        // Mock with single result to test destructuring [stats] = results
        const mockResults = [{ fileCount: 15, linesOfCode: 750 }];
        mockAggregationCursor.toArray.mockResolvedValue(mockResults);

        const result = await repository.getProjectFileAndLineStats(projectName);

        expect(result).toEqual({ fileCount: 15, linesOfCode: 750 });
        expect(mockCollection.aggregate).toHaveBeenCalledTimes(1);
      });

      it("should handle array destructuring with empty array (undefined first element)", async () => {
        const projectName = "test-project";
        // Mock with empty array - destructuring [stats] = [] will set stats to undefined
        mockAggregationCursor.toArray.mockResolvedValue([]);

        const result = await repository.getProjectFileAndLineStats(projectName);

        // Should return default values when destructuring finds undefined
        expect(result).toEqual({ fileCount: 0, linesOfCode: 0 });
      });
    });

    describe("getProjectFileTypesCountAndLines", () => {
      it("should return file type statistics", async () => {
        const projectName = "test-project";
        const mockResults = [
          { fileType: "ts", lines: 1000, files: 10 },
          { fileType: "js", lines: 500, files: 5 },
        ];
        mockAggregationCursor.toArray.mockResolvedValue(mockResults);

        const result = await repository.getProjectFileTypesCountAndLines(projectName);

        expect(result).toEqual(mockResults);

        const expectedPipeline = [
          { $match: { projectName } },
          {
            $group: {
              _id: "$fileType",
              lines: { $sum: "$linesCount" },
              files: { $sum: 1 },
            },
          },
          { $set: { fileType: "$_id" } },
          { $sort: { files: -1, lines: -1 } },
        ];
        expect(mockCollection.aggregate).toHaveBeenCalledWith(expectedPipeline);
      });
    });
  });

  describe("query methods", () => {
    describe("getProjectSourcesSummaries", () => {
      it("should construct correct query and projection", async () => {
        const projectName = "test-project";
        const fileTypes = ["ts", "js"];
        const mockResults = [
          {
            summary: { namespace: "Class1", purpose: "Purpose1", implementation: "Impl1" },
            filepath: "src/test1.ts",
          },
        ];
        mockFindCursor.toArray.mockResolvedValue(mockResults);

        const result = await repository.getProjectSourcesSummariesByFileType(
          projectName,
          fileTypes,
        );

        expect(result).toEqual(mockResults);
        expect(mockCollection.find).toHaveBeenCalledWith(
          { projectName, fileType: { $in: fileTypes } },
          {
            projection: {
              _id: 0,
              "summary.namespace": 1,
              "summary.purpose": 1,
              "summary.implementation": 1,
              "summary.dependencies": 1,
              "summary.scheduledJobs": 1,
              "summary.internalReferences": 1,
              "summary.jspMetrics": 1,
              "summary.uiFramework": 1,
              filepath: 1,
            },
            sort: { "summary.namespace": 1 },
          },
        );
      });

      it("should query all file types when empty array is provided", async () => {
        const projectName = "test-project";
        const fileTypes: string[] = [];
        const mockResults = [
          {
            summary: { namespace: "Class1", purpose: "Purpose1", implementation: "Impl1" },
            filepath: "src/test1.ts",
          },
        ];
        mockFindCursor.toArray.mockResolvedValue(mockResults);

        const result = await repository.getProjectSourcesSummariesByFileType(
          projectName,
          fileTypes,
        );

        expect(result).toEqual(mockResults);
        // Should query without type filter when fileTypes is empty
        expect(mockCollection.find).toHaveBeenCalledWith(
          { projectName },
          {
            projection: {
              _id: 0,
              "summary.namespace": 1,
              "summary.purpose": 1,
              "summary.implementation": 1,
              "summary.dependencies": 1,
              "summary.scheduledJobs": 1,
              "summary.internalReferences": 1,
              "summary.jspMetrics": 1,
              "summary.uiFramework": 1,
              filepath: 1,
            },
            sort: { "summary.namespace": 1 },
          },
        );
      });
    });

    describe("getProjectDatabaseIntegrations", () => {
      it("should construct correct query for database integrations", async () => {
        const projectName = "test-project";
        const mockResults = [
          {
            summary: {
              namespace: "DatabaseService",
              databaseIntegration: {
                mechanism: "JPA",
                description: "Uses JPA for data access",
                codeExample: "@Entity class User {}",
              },
            },
            filepath: "src/service/DatabaseService.java",
          },
        ];
        mockFindCursor.toArray.mockResolvedValue(mockResults);

        const result = await repository.getProjectDatabaseIntegrations(projectName);

        expect(result).toEqual(mockResults);
        expect(mockCollection.find).toHaveBeenCalledWith(
          {
            projectName,
            "summary.databaseIntegration": { $exists: true, $ne: null },
            "summary.databaseIntegration.mechanism": { $ne: "NONE" },
          },
          {
            projection: {
              _id: 0,
              "summary.namespace": 1,
              "summary.databaseIntegration": 1,
              filepath: 1,
            },
            sort: {
              // Order of keys is not semantically important, but we mirror implementation for clarity
              "summary.databaseIntegration.mechanism": 1,
              "summary.namespace": 1,
            },
          },
        );
      });
    });

    describe("getProjectStoredProceduresAndTriggers", () => {
      it("should construct correct complex query with $or condition", async () => {
        const projectName = "test-project";
        const mockResults = [
          {
            summary: {
              storedProcedures: ["proc1", "proc2"],
              triggers: ["trigger1"],
            },
            filepath: "db/procedures.sql",
          },
        ];
        mockFindCursor.toArray.mockResolvedValue(mockResults);

        const result = await repository.getProjectStoredProceduresAndTriggers(projectName);

        expect(result).toEqual(mockResults);
        expect(mockCollection.find).toHaveBeenCalledWith(
          {
            $and: [
              { projectName },
              {
                $or: [
                  { "summary.storedProcedures": { $exists: true, $ne: [] } },
                  { "summary.triggers": { $exists: true, $ne: [] } },
                ],
              },
            ],
          },
          { projection: { _id: 0, summary: 1, filepath: 1 } },
        );
      });
    });

    describe("getProjectFilesPaths", () => {
      it("should return array of file paths", async () => {
        const projectName = "test-project";
        const mockCursor = {
          map: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(["src/test1.ts", "src/test2.ts"]),
          }),
          toArray: jest.fn(),
        };
        mockCollection.find.mockReturnValue(mockCursor as any);

        const result = await repository.getProjectFilesPaths(projectName);

        expect(result).toEqual(["src/test1.ts", "src/test2.ts"]);
        expect(mockCollection.find).toHaveBeenCalledWith(
          { projectName },
          { projection: { _id: 0, filepath: 1 } },
        );
      });
    });
  });

  describe("getTopLevelJavaClassDependencies", () => {
    it("should construct correct aggregation pipeline using config constants", async () => {
      const projectName = "test-project";
      const fileType = "java";
      const mockResults = [
        {
          namespace: "com.example.TopLevelClass",
          dependency_count: 3,
          dependencies: [
            {
              level: 0,
              namespace: "com.example.Dependency1",
              references: ["com.example.Util"],
            },
          ],
        },
      ];
      mockAggregationCursor.toArray.mockResolvedValue(mockResults);

      const result = await repository.getTopLevelClassDependencies(projectName, fileType);

      expect(result).toEqual(mockResults);

      // Verify that aggregate was called with a pipeline containing the config constants
      expect(mockCollection.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            $graphLookup: expect.objectContaining({
              maxDepth: databaseConfig.DEPENDENCY_GRAPH_MAX_DEPTH,
            }),
          }),
        ]),
      );

      // Verify the limit stage uses the config constant
      const aggregateCalls = mockCollection.aggregate.mock.calls;
      expect(aggregateCalls.length).toBeGreaterThan(0);
      const pipeline = aggregateCalls[0][0]!;
      const limitStage = pipeline.find((stage: any) => stage.$limit !== undefined);
      expect(limitStage?.$limit).toBe(databaseConfig.DEPENDENCY_GRAPH_RESULT_LIMIT);
    });

    it("should accept fileType parameter and use it in query", async () => {
      const projectName = "test-project";
      const fileType = "java";
      mockAggregationCursor.toArray.mockResolvedValue([]);

      await repository.getTopLevelClassDependencies(projectName, fileType);

      const aggregateCalls = mockCollection.aggregate.mock.calls;
      expect(aggregateCalls.length).toBeGreaterThan(0);
      const pipeline = aggregateCalls[0][0]!;

      // Verify fileType parameter is used in the $match stage
      const matchStage = pipeline.find((stage: any) => stage.$match?.fileType !== undefined);
      expect(matchStage?.$match).toEqual({
        projectName: "test-project",
        fileType: "java",
      });
    });

    it("should filter files and exclude javax references", async () => {
      const projectName = "test-project";
      const fileType = "java";
      mockAggregationCursor.toArray.mockResolvedValue([]);

      await repository.getTopLevelClassDependencies(projectName, fileType);

      const aggregateCalls = mockCollection.aggregate.mock.calls;
      expect(aggregateCalls.length).toBeGreaterThan(0);
      const pipeline = aggregateCalls[0][0]!;

      // Verify file type matching
      const matchStage = pipeline.find((stage: any) => stage.$match?.fileType !== undefined);
      expect(matchStage).toBeDefined();

      // Verify javax exclusion
      const regexMatchStage = pipeline.find(
        (stage: any) => stage.$match?.references?.$not !== undefined,
      );
      expect(regexMatchStage).toBeDefined();
    });

    it("should return top-level classes sorted by dependency count", async () => {
      const projectName = "test-project";
      const fileType = "java";
      const mockResults = [
        { namespace: "Class1", dependency_count: 10, dependencies: [] },
        { namespace: "Class2", dependency_count: 5, dependencies: [] },
      ];
      mockAggregationCursor.toArray.mockResolvedValue(mockResults);

      const result = await repository.getTopLevelClassDependencies(projectName, fileType);

      expect(result).toEqual(mockResults);

      // Verify sorting is by dependency_count descending
      const aggregateCalls = mockCollection.aggregate.mock.calls;
      expect(aggregateCalls.length).toBeGreaterThan(0);
      const pipeline = aggregateCalls[0][0]!;
      const sortStage = pipeline.find((stage: any) => stage.$sort !== undefined);
      expect(sortStage?.$sort).toEqual({ dependency_count: -1 });
    });
  });

  describe("getProjectIntegrationPoints", () => {
    it("should return integration points for a project", async () => {
      const projectName = "test-project";
      const mockIntegrationPoints = [
        {
          filepath: "src/controllers/UserController.java",
          summary: {
            namespace: "com.example.UserController",
            integrationPoints: [
              {
                mechanism: "REST",
                name: "getUsers",
                path: "/api/users",
                method: "GET",
                description: "Get all users",
                requestBody: undefined,
                responseBody: "List of users",
                authentication: "JWT",
              },
              {
                mechanism: "JMS-QUEUE",
                name: "userNotificationQueue",
                queueOrTopicName: "user.notifications",
                messageType: "UserNotification",
                direction: "PRODUCER",
                description: "Send user notifications to queue",
              },
            ],
          },
        },
      ];
      mockFindCursor.toArray.mockResolvedValue(mockIntegrationPoints);

      const result = await repository.getProjectIntegrationPoints(projectName);

      expect(result).toEqual(mockIntegrationPoints);
      expect(mockCollection.find).toHaveBeenCalledWith(
        {
          projectName,
          "summary.integrationPoints": { $exists: true, $ne: [] },
        },
        {
          projection: {
            _id: 0,
            "summary.namespace": 1,
            "summary.integrationPoints": 1,
            filepath: 1,
          },
          sort: { "summary.namespace": 1 },
        },
      );
    });

    it("should return empty array when no integration points exist", async () => {
      const projectName = "test-project";
      mockFindCursor.toArray.mockResolvedValue([]);

      const result = await repository.getProjectIntegrationPoints(projectName);

      expect(result).toEqual([]);
    });

    it("should sort results by namespace", async () => {
      const projectName = "test-project";
      mockFindCursor.toArray.mockResolvedValue([]);

      await repository.getProjectIntegrationPoints(projectName);

      const findCalls = mockCollection.find.mock.calls;
      expect(findCalls.length).toBeGreaterThan(0);
      const options = findCalls[0][1]!;
      expect(options.sort).toEqual({ "summary.namespace": 1 });
    });
  });
});
