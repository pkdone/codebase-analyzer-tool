import "reflect-metadata";
import { MongoClient, Collection, AggregationCursor, FindCursor } from "mongodb";
import { Double } from "bson";
import SourcesRepositoryImpl from "../../../../src/app/repositories/sources/sources.repository";
import { SourceRecord } from "../../../../src/app/repositories/sources/sources.model";
import { databaseConfig } from "../../../../src/app/config/database.config";
import { codeQualityConfig } from "../../../../src/app/config/code-quality.config";
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
      insertMany: jest.fn(),
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

    // Instantiate repository with injected configs
    repository = new SourcesRepositoryImpl(
      mockMongoClient,
      "test-db",
      databaseConfig,
      codeQualityConfig,
    );
  });

  describe("insertSource", () => {
    it("should insert a source record successfully", async () => {
      const mockSourceRecord: SourceRecord = {
        projectName: "test-project",
        filename: "test.ts",
        filepath: "src/test.ts",
        fileExtension: "ts",
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
        fileExtension: "ts",
        linesCount: 10,
        content: "console.log('test');",
      };

      const mongoError = new Error("MongoDB validation error");
      mockCollection.insertOne.mockRejectedValue(mongoError);

      await expect(repository.insertSource(mockSourceRecord)).rejects.toThrow(mongoError);
      expect(mockMdbErrorUtils.logMongoValidationErrorIfPresent).toHaveBeenCalledWith(mongoError);
    });
  });

  describe("insertSources", () => {
    it("should insert multiple source records in a single batch operation", async () => {
      const mockSourceRecords: SourceRecord[] = [
        {
          projectName: "test-project",
          filename: "test1.ts",
          filepath: "src/test1.ts",
          fileExtension: "ts",
          linesCount: 10,
          content: "console.log('test1');",
        },
        {
          projectName: "test-project",
          filename: "test2.ts",
          filepath: "src/test2.ts",
          fileExtension: "ts",
          linesCount: 20,
          content: "console.log('test2');",
        },
      ];

      mockCollection.insertMany.mockResolvedValue({} as any);

      await repository.insertSources(mockSourceRecords);

      expect(mockCollection.insertMany).toHaveBeenCalledWith(mockSourceRecords, { ordered: false });
    });

    it("should not call insertMany when records array is empty", async () => {
      await repository.insertSources([]);

      expect(mockCollection.insertMany).not.toHaveBeenCalled();
    });

    it("should handle MongoDB errors during batch insert", async () => {
      const mockSourceRecords: SourceRecord[] = [
        {
          projectName: "test-project",
          filename: "test1.ts",
          filepath: "src/test1.ts",
          fileExtension: "ts",
          linesCount: 10,
          content: "console.log('test1');",
        },
      ];

      const mongoError = new Error("MongoDB batch insert error");
      mockCollection.insertMany.mockRejectedValue(mongoError);

      await expect(repository.insertSources(mockSourceRecords)).rejects.toThrow(mongoError);
    });

    it("should use ordered: false to continue on individual document failures", async () => {
      const mockSourceRecords: SourceRecord[] = [
        {
          projectName: "test-project",
          filename: "test1.ts",
          filepath: "src/test1.ts",
          fileExtension: "ts",
          linesCount: 10,
          content: "console.log('test1');",
        },
      ];

      mockCollection.insertMany.mockResolvedValue({} as any);

      await repository.insertSources(mockSourceRecords);

      // Verify ordered: false is passed (allows continuing even if some docs fail)
      expect(mockCollection.insertMany).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ ordered: false }),
      );
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

  describe("vectorSearchProjectSources", () => {
    it("should construct correct aggregation pipeline", async () => {
      const projectName = "test-project";
      const queryVector = [1.0, 2.0, 3.0];
      const numCandidates = 100;
      const limit = 10;

      const mockResults = [
        {
          projectName,
          filepath: "src/test.ts",
          fileExtension: "ts",
          content: "test content",
          summary: { namespace: "Test" },
        },
      ];

      mockAggregationCursor.toArray.mockResolvedValue(mockResults);

      const result = await repository.vectorSearchProjectSources(
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
            fileExtension: 1,
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

      await repository.vectorSearchProjectSources("test-project", queryVector, 100, 10);

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
        repository.vectorSearchProjectSources("test", [1, 2, 3], 100, 10),
      ).rejects.toThrow(mongoError);

      expect(mockLogging.logErr).toHaveBeenCalledWith(
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

      it("should handle malformed aggregation result with type guard validation", async () => {
        const projectName = "test-project";
        // Mock with malformed result that doesn't match ProjectedFileAndLineStats
        const malformedResults = [{ wrongField: "bad data", anotherField: 123 }];
        mockAggregationCursor.toArray.mockResolvedValue(malformedResults);

        const result = await repository.getProjectFileAndLineStats(projectName);

        // Type guard should reject malformed data and return defaults
        expect(result).toEqual({ fileCount: 0, linesOfCode: 0 });
      });

      it("should handle aggregation result with missing fileCount field", async () => {
        const projectName = "test-project";
        // Mock with result missing fileCount
        const partialResults = [{ linesOfCode: 1500 }];
        mockAggregationCursor.toArray.mockResolvedValue(partialResults);

        const result = await repository.getProjectFileAndLineStats(projectName);

        // Type guard should reject partial data and return defaults
        expect(result).toEqual({ fileCount: 0, linesOfCode: 0 });
      });

      it("should handle aggregation result with wrong types", async () => {
        const projectName = "test-project";
        // Mock with result having wrong types
        const wrongTypeResults = [{ fileCount: "not a number", linesOfCode: "also wrong" }];
        mockAggregationCursor.toArray.mockResolvedValue(wrongTypeResults);

        const result = await repository.getProjectFileAndLineStats(projectName);

        // Type guard should reject wrong types and return defaults
        expect(result).toEqual({ fileCount: 0, linesOfCode: 0 });
      });
    });

    describe("getProjectFileExtensionStats", () => {
      it("should return file type statistics", async () => {
        const projectName = "test-project";
        const mockResults = [
          { fileExtension: "ts", lines: 1000, files: 10 },
          { fileExtension: "js", lines: 500, files: 5 },
        ];
        mockAggregationCursor.toArray.mockResolvedValue(mockResults);

        const result = await repository.getProjectFileExtensionStats(projectName);

        expect(result).toEqual(mockResults);

        const expectedPipeline = [
          { $match: { projectName } },
          {
            $group: {
              _id: "$fileExtension",
              lines: { $sum: "$linesCount" },
              files: { $sum: 1 },
            },
          },
          { $set: { fileExtension: "$_id" } },
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

        const result = await repository.getProjectSourcesSummariesByFileExtension(
          projectName,
          fileTypes,
        );

        expect(result).toEqual(mockResults);
        expect(mockCollection.find).toHaveBeenCalledWith(
          { projectName, fileExtension: { $in: fileTypes } },
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

        const result = await repository.getProjectSourcesSummariesByFileExtension(
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

  describe("getTopComplexFunctions", () => {
    it("should return top complex functions with correct type structure", async () => {
      const projectName = "test-project";
      const mockResults = [
        {
          functionName: "com.example.Service::processData",
          filePath: "src/service/DataService.java",
          complexity: 25,
          linesOfCode: 150,
          codeSmells: ["LONG_METHOD", "HIGH_COMPLEXITY"],
        },
        {
          functionName: "com.example.Utils::parseInput",
          filePath: "src/utils/Parser.java",
          complexity: 18,
          linesOfCode: 80,
          codeSmells: [],
        },
      ];
      mockAggregationCursor.toArray.mockResolvedValue(mockResults);

      const result = await repository.getTopComplexFunctions(projectName, 10);

      expect(result).toEqual(mockResults);
      expect(result[0].functionName).toBe("com.example.Service::processData");
      expect(result[0].filePath).toBe("src/service/DataService.java");
      expect(result[0].complexity).toBe(25);
      expect(result[0].linesOfCode).toBe(150);
      expect(result[0].codeSmells).toEqual(["LONG_METHOD", "HIGH_COMPLEXITY"]);
      expect(mockCollection.aggregate).toHaveBeenCalled();
    });

    it("should return empty array when no complex functions exist", async () => {
      const projectName = "test-project";
      mockAggregationCursor.toArray.mockResolvedValue([]);

      const result = await repository.getTopComplexFunctions(projectName);

      expect(result).toEqual([]);
    });

    it("should use default limit of 10", async () => {
      const projectName = "test-project";
      mockAggregationCursor.toArray.mockResolvedValue([]);

      await repository.getTopComplexFunctions(projectName);

      const aggregateCalls = mockCollection.aggregate.mock.calls;
      expect(aggregateCalls.length).toBeGreaterThan(0);
      const pipeline = aggregateCalls[0][0] as Record<string, unknown>[];
      const limitStage = pipeline.find((stage) => "$limit" in stage);
      expect(limitStage).toEqual({ $limit: 10 });
    });

    it("should accept custom limit parameter", async () => {
      const projectName = "test-project";
      mockAggregationCursor.toArray.mockResolvedValue([]);

      await repository.getTopComplexFunctions(projectName, 5);

      const aggregateCalls = mockCollection.aggregate.mock.calls;
      expect(aggregateCalls.length).toBeGreaterThan(0);
      const pipeline = aggregateCalls[0][0] as Record<string, unknown>[];
      const limitStage = pipeline.find((stage) => "$limit" in stage);
      expect(limitStage).toEqual({ $limit: 5 });
    });
  });

  describe("getCodeSmellStatistics", () => {
    it("should return code smell statistics with correct type structure", async () => {
      const projectName = "test-project";
      const mockResults = [
        {
          smellType: "LONG_METHOD",
          occurrences: 15,
          affectedFiles: 8,
        },
        {
          smellType: "HIGH_COMPLEXITY",
          occurrences: 10,
          affectedFiles: 5,
        },
      ];
      mockAggregationCursor.toArray.mockResolvedValue(mockResults);

      const result = await repository.getCodeSmellStatistics(projectName);

      expect(result).toEqual(mockResults);
      expect(result[0].smellType).toBe("LONG_METHOD");
      expect(result[0].occurrences).toBe(15);
      expect(result[0].affectedFiles).toBe(8);
    });

    it("should return empty array when no code smells exist", async () => {
      const projectName = "test-project";
      mockAggregationCursor.toArray.mockResolvedValue([]);

      const result = await repository.getCodeSmellStatistics(projectName);

      expect(result).toEqual([]);
    });
  });

  describe("getCodeQualityStatistics", () => {
    it("should return code quality statistics with correct type structure", async () => {
      const projectName = "test-project";
      const mockResults = [
        {
          totalFunctions: 100,
          averageComplexity: 5.5,
          highComplexityCount: 10,
          veryHighComplexityCount: 3,
          averageFunctionLength: 25.2,
          longFunctionCount: 8,
        },
      ];
      mockAggregationCursor.toArray.mockResolvedValue(mockResults);

      const result = await repository.getCodeQualityStatistics(projectName);

      expect(result).toEqual(mockResults[0]);
      expect(result.totalFunctions).toBe(100);
      expect(result.averageComplexity).toBe(5.5);
      expect(result.highComplexityCount).toBe(10);
      expect(result.veryHighComplexityCount).toBe(3);
      expect(result.averageFunctionLength).toBe(25.2);
      expect(result.longFunctionCount).toBe(8);
    });

    it("should return default values when no functions exist", async () => {
      const projectName = "test-project";
      mockAggregationCursor.toArray.mockResolvedValue([]);

      const result = await repository.getCodeQualityStatistics(projectName);

      expect(result).toEqual({
        totalFunctions: 0,
        averageComplexity: 0,
        highComplexityCount: 0,
        veryHighComplexityCount: 0,
        averageFunctionLength: 0,
        longFunctionCount: 0,
      });
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
