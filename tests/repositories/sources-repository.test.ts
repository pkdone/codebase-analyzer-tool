import "reflect-metadata";
import { MongoClient, Collection, AggregationCursor, FindCursor } from "mongodb";
import { Double } from "bson";
import SourcesRepositoryImpl from "../../src/repositories/source/sources.repository";
import { SourceRecord } from "../../src/repositories/source/sources.model";
import { databaseConfig } from "../../src/config/database.config";
import * as logging from "../../src/common/utils/logging";
import * as mdbErrorUtils from "../../src/common/mdb/mdb-error-utils";

// Mock dependencies
jest.mock("../../src/common/utils/logging");
jest.mock("../../src/common/mdb/mdb-error-utils");

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
        type: "ts",
        linesCount: 10,
        content: "console.log('test');",
        summary: {
          classpath: "Test",
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
        type: "ts",
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
      const fileType = "ts";
      const queryVector = [1.0, 2.0, 3.0];
      const numCandidates = 100;
      const limit = 10;

      const mockResults = [
        {
          projectName,
          filepath: "src/test.ts",
          type: fileType,
          content: "test content",
          summary: { classpath: "Test" },
        },
      ];

      mockAggregationCursor.toArray.mockResolvedValue(mockResults);

      const result = await repository.vectorSearchProjectSourcesRawContent(
        projectName,
        fileType,
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
              $and: [{ projectName: { $eq: projectName } }, { type: { $eq: fileType } }],
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
            type: 1,
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

      await repository.vectorSearchProjectSourcesRawContent(
        "test-project",
        "ts",
        queryVector,
        100,
        10,
      );

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
        repository.vectorSearchProjectSourcesRawContent("test", "ts", [1, 2, 3], 100, 10),
      ).rejects.toThrow(mongoError);

      expect(mockLogging.logErrorMsgAndDetail).toHaveBeenCalledWith(
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
              _id: "$type",
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
            summary: { classpath: "Class1", purpose: "Purpose1", implementation: "Impl1" },
            filepath: "src/test1.ts",
          },
        ];
        mockFindCursor.toArray.mockResolvedValue(mockResults);

        const result = await repository.getProjectSourcesSummaries(projectName, fileTypes);

        expect(result).toEqual(mockResults);
        expect(mockCollection.find).toHaveBeenCalledWith(
          { projectName, type: { $in: fileTypes } },
          {
            projection: {
              _id: 0,
              "summary.classpath": 1,
              "summary.purpose": 1,
              "summary.implementation": 1,
              filepath: 1,
            },
            sort: { "summary.classpath": 1 },
          },
        );
      });
    });

    describe("getProjectDatabaseIntegrations", () => {
      it("should construct correct query for database integrations", async () => {
        const projectName = "test-project";
        const fileTypes = ["java", "ts"];
        const mockResults = [
          {
            summary: {
              classpath: "DatabaseService",
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

        const result = await repository.getProjectDatabaseIntegrations(projectName, fileTypes);

        expect(result).toEqual(mockResults);
        expect(mockCollection.find).toHaveBeenCalledWith(
          {
            projectName,
            type: { $in: fileTypes },
            "summary.databaseIntegration": { $exists: true, $ne: null },
            "summary.databaseIntegration.mechanism": { $ne: "NONE" },
          },
          {
            projection: {
              _id: 0,
              "summary.classpath": 1,
              "summary.databaseIntegration.mechanism": 1,
              "summary.databaseIntegration.description": 1,
              "summary.databaseIntegration.codeExample": 1,
              filepath: 1,
            },
            sort: {
              "summary.databaseIntegration.mechanism": 1,
              "summary.classpath": 1,
            },
          },
        );
      });
    });

    describe("getProjectStoredProceduresAndTriggers", () => {
      it("should construct correct complex query with $or condition", async () => {
        const projectName = "test-project";
        const fileTypes = ["sql"];
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

        const result = await repository.getProjectStoredProceduresAndTriggers(
          projectName,
          fileTypes,
        );

        expect(result).toEqual(mockResults);
        expect(mockCollection.find).toHaveBeenCalledWith(
          {
            $and: [
              { projectName },
              { type: { $in: fileTypes } },
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
            toArray: jest.fn().mockResolvedValue(["src/test1.ts", "src/test2.js"]),
          }),
          toArray: jest.fn(),
        };
        mockCollection.find.mockReturnValue(mockCursor as any);

        const result = await repository.getProjectFilesPaths(projectName);

        expect(result).toEqual(["src/test1.ts", "src/test2.js"]);
        expect(mockCollection.find).toHaveBeenCalledWith(
          { projectName },
          { projection: { _id: 0, filepath: 1 } },
        );
      });
    });
  });

  describe("getCollectionValidationSchema", () => {
    it("should return the JSON schema", () => {
      const result = repository.getCollectionValidationSchema();

      expect(result).toBeDefined();
      expect(typeof result).toBe("object");
    });
  });
});
