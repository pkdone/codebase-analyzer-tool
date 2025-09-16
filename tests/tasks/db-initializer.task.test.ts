import "reflect-metadata";
import { DBInitializerTask } from "../../src/tasks/db-initializer.task";
import { MongoClient, Db, Collection, MongoServerError } from "mongodb";
import { SourcesRepository } from "../../src/repositories/source/sources.repository.interface";
import { AppSummariesRepository } from "../../src/repositories/app-summary/app-summaries.repository.interface";

jest.mock("../../src/config/database.config", () => ({
  databaseConfig: {
    CODEBASE_DB_NAME: "test-codebase",
    SOURCES_COLLECTION_NAME: "sources",
    SUMMARIES_COLLECTION_NAME: "summaries",
    CONTENT_VECTOR_FIELD: "contentVector",
    CONTENT_VECTOR_INDEX_NAME: "content_vector_index",
    SUMMARY_VECTOR_FIELD: "summaryVector",
    SUMMARY_VECTOR_INDEX_NAME: "summary_vector_index",
    DEFAULT_VECTOR_DIMENSIONS: 1536,
    VECTOR_SIMILARITY_TYPE: "euclidean",
    VECTOR_QUANTIZATION_TYPE: "scalar",
  },
}));

describe("DBInitializerTask", () => {
  let dbInitializer: DBInitializerTask;
  let mockMongoClient: jest.Mocked<MongoClient>;
  let mockDb: jest.Mocked<Db>;
  let mockSourcesCollection: jest.Mocked<Collection>;
  let mockSummariesCollection: jest.Mocked<Collection>;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockAppSummariesRepository: jest.Mocked<AppSummariesRepository>;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;

  beforeEach(() => {
    // Mock console methods
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
    mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation();

    // Mock collections
    mockSourcesCollection = {
      collectionName: "sources",
      dbName: "test-codebase",
      createIndex: jest.fn().mockResolvedValue(undefined),
      createSearchIndexes: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Collection>;

    mockSummariesCollection = {
      collectionName: "summaries",
      dbName: "test-codebase",
      createIndex: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Collection>;

    // Mock database
    mockDb = {
      databaseName: "test-codebase",
      collection: jest.fn().mockImplementation((name: string) => {
        if (name === "sources") return mockSourcesCollection;
        if (name === "summaries") return mockSummariesCollection;
        throw new Error(`Unexpected collection: ${name}`);
      }),
      createCollection: jest.fn().mockResolvedValue(undefined),
      command: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<Db>;

    // Mock MongoClient
    mockMongoClient = {
      db: jest.fn().mockReturnValue(mockDb),
    } as unknown as jest.Mocked<MongoClient>;

    // Mock repositories
    mockSourcesRepository = {
      getCollectionValidationSchema: jest.fn().mockReturnValue({ type: "object" }),
    } as unknown as jest.Mocked<SourcesRepository>;

    mockAppSummariesRepository = {
      getCollectionValidationSchema: jest.fn().mockReturnValue({ type: "object" }),
    } as unknown as jest.Mocked<AppSummariesRepository>;

    dbInitializer = new DBInitializerTask(
      mockMongoClient,
      mockSourcesRepository,
      mockAppSummariesRepository,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe("execute", () => {
    it("should execute database initialization successfully", async () => {
      await dbInitializer.execute();

      expect(mockDb.createCollection).toHaveBeenCalledTimes(2);
      expect(mockSourcesCollection.createIndex).toHaveBeenCalledWith(
        {
          projectName: 1,
          type: 1,
          "summary.classpath": 1,
        },
        { unique: false },
      );
      expect(mockSummariesCollection.createIndex).toHaveBeenCalledWith(
        { projectName: 1 },
        { unique: false },
      );
      expect(mockSourcesCollection.createSearchIndexes).toHaveBeenCalled();
    });
  });

  describe("collection creation with validator", () => {
    it("should create new collection with validator successfully", async () => {
      await dbInitializer.execute();

      expect(mockDb.createCollection).toHaveBeenCalledWith("sources", {
        validator: { $jsonSchema: { type: "object" } },
        validationLevel: "strict",
        validationAction: "error",
      });
      expect(mockDb.createCollection).toHaveBeenCalledWith("summaries", {
        validator: { $jsonSchema: { type: "object" } },
        validationLevel: "strict",
        validationAction: "error",
      });
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Created collection 'test-codebase.sources' with JSON schema validator",
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Created collection 'test-codebase.summaries' with JSON schema validator",
      );
    });

    it("should update existing collection validator when NamespaceExists error occurs", async () => {
      const namespaceError = new MongoServerError({ message: "Collection already exists" });
      (namespaceError as any).code = 48; // NamespaceExists error code

      mockDb.createCollection.mockRejectedValueOnce(namespaceError);

      await dbInitializer.execute();

      expect(mockDb.command).toHaveBeenCalledWith({
        collMod: "sources",
        validator: { $jsonSchema: { type: "object" } },
        validationLevel: "strict",
        validationAction: "error",
      });
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Updated JSON schema validator for collection 'test-codebase.sources'",
      );
    });

    it("should handle validator update failure gracefully", async () => {
      const namespaceError = new MongoServerError({ message: "Collection already exists" });
      (namespaceError as any).code = 48;

      const updateError = new Error("Validator update failed");
      mockDb.createCollection.mockRejectedValueOnce(namespaceError);
      mockDb.command.mockRejectedValueOnce(updateError);

      // Should not throw - should handle error gracefully
      await dbInitializer.execute();

      expect(mockDb.command).toHaveBeenCalled();
    });

    it("should handle other collection creation errors gracefully", async () => {
      const permissionError = new Error("Permission denied");
      mockDb.createCollection.mockRejectedValueOnce(permissionError);

      // Should not throw - should handle error gracefully
      await dbInitializer.execute();

      expect(mockDb.createCollection).toHaveBeenCalled();
    });
  });

  describe("vector search index creation", () => {
    it("should create vector search indexes successfully", async () => {
      await dbInitializer.execute();

      expect(mockSourcesCollection.createSearchIndexes).toHaveBeenCalledWith([
        {
          name: "content_vector_index",
          type: "vectorSearch",
          definition: {
            fields: [
              {
                type: "vector",
                path: "contentVector",
                numDimensions: 1536,
                similarity: "euclidean",
                quantization: "scalar",
              },
              {
                type: "filter",
                path: "projectName",
              },
              {
                type: "filter",
                path: "type",
              },
            ],
          },
        },
        {
          name: "summary_vector_index",
          type: "vectorSearch",
          definition: {
            fields: [
              {
                type: "vector",
                path: "summaryVector",
                numDimensions: 1536,
                similarity: "euclidean",
                quantization: "scalar",
              },
              {
                type: "filter",
                path: "projectName",
              },
              {
                type: "filter",
                path: "type",
              },
            ],
          },
        },
      ]);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Ensured Vector Search indexes exist for the MongoDB database collection: 'test-codebase.sources'",
      );
    });

    it("should handle duplicate index errors gracefully (error code 11000)", async () => {
      const duplicateError = new MongoServerError({ message: "Index already exists" });
      (duplicateError as any).code = 11000;

      mockSourcesCollection.createSearchIndexes.mockRejectedValueOnce(duplicateError);

      await dbInitializer.execute();

      expect(mockSourcesCollection.createSearchIndexes).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Ensured Vector Search indexes exist for the MongoDB database collection: 'test-codebase.sources'",
      );
    });

    it("should handle duplicate index errors gracefully (error code 68)", async () => {
      const duplicateError = new MongoServerError({ message: "Index already exists" });
      (duplicateError as any).code = 68;

      mockSourcesCollection.createSearchIndexes.mockRejectedValueOnce(duplicateError);

      await dbInitializer.execute();

      expect(mockSourcesCollection.createSearchIndexes).toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Ensured Vector Search indexes exist for the MongoDB database collection: 'test-codebase.sources'",
      );
    });

    it("should log unknown errors during vector index creation", async () => {
      const unknownError = new Error("Unknown vector search error");
      mockSourcesCollection.createSearchIndexes.mockRejectedValueOnce(unknownError);

      await dbInitializer.execute();

      expect(mockSourcesCollection.createSearchIndexes).toHaveBeenCalled();
      // Should not log success message when unknown error occurs
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        "Ensured Vector Search indexes exist for the MongoDB database collection: 'test-codebase.sources'",
      );
    });

    it("should log unknown MongoDB server errors during vector index creation", async () => {
      const unknownMongoError = new MongoServerError({ message: "Unknown MongoDB error" });
      (unknownMongoError as any).code = 999; // Unknown error code

      mockSourcesCollection.createSearchIndexes.mockRejectedValueOnce(unknownMongoError);

      await dbInitializer.execute();

      expect(mockSourcesCollection.createSearchIndexes).toHaveBeenCalled();
      // Should not log success message when unknown error occurs
      expect(mockConsoleLog).not.toHaveBeenCalledWith(
        "Ensured Vector Search indexes exist for the MongoDB database collection: 'test-codebase.sources'",
      );
    });
  });

  describe("standard index creation", () => {
    it("should create standard indexes successfully", async () => {
      await dbInitializer.execute();

      expect(mockSourcesCollection.createIndex).toHaveBeenCalledWith(
        {
          projectName: 1,
          type: 1,
          "summary.classpath": 1,
        },
        { unique: false },
      );
      expect(mockSummariesCollection.createIndex).toHaveBeenCalledWith(
        { projectName: 1 },
        { unique: false },
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Ensured normal indexes exist for the MongoDB database collection: 'test-codebase.sources'",
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Ensured normal indexes exist for the MongoDB database collection: 'test-codebase.summaries'",
      );
    });

    it("should handle standard index creation errors", async () => {
      const indexError = new Error("Index creation failed");
      mockSourcesCollection.createIndex.mockRejectedValueOnce(indexError);

      await expect(dbInitializer.execute()).rejects.toThrow("Index creation failed");

      expect(mockSourcesCollection.createIndex).toHaveBeenCalled();
    });
  });
});
