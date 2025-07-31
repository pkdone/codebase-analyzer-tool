import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { MongoClient, Db, Collection, IndexSpecification, MongoServerError } from "mongodb";
import { TOKENS } from "../di/tokens";
import { databaseConfig } from "../config/database.config";
import { logErrorMsgAndDetail } from "../common/utils/error-utils";
import { createVectorSearchIndexDefinition } from "../common/mdb/mdb-utils";
import { Task } from "../lifecycle/task.types";
import * as sourceSchema from "../repositories/source/sources.model";
import * as appSummarySchema from "../repositories/app-summary/app-summaries.model";

// MongoDB error code for duplicate key errors (including duplicate indexes).
// @see https://docs.mongodb.com/manual/reference/error-codes/#DuplicateKey
const MONGODB_DUPLICATE_KEY_ERROR_CODE = 11000;

/**
 * Configuration for vector search indexes
 */
interface VectorIndexConfig {
  field: string;
  name: string;
}

/**
 * Task responsible for database schema initialization and management.
 * Handles all DDL operations including index creation for both collections.
 */
@injectable()
export class DBInitializerTask implements Task {
  private readonly db: Db;
  private readonly sourcesCollection: Collection;
  private readonly appSummariesCollection: Collection;

  /**
   * Vector index configurations for declarative index creation
   */
  private readonly vectorIndexConfigs: VectorIndexConfig[] = [
    { field: databaseConfig.CONTENT_VECTOR_FIELD, name: databaseConfig.CONTENT_VECTOR_INDEX_NAME },
    { field: databaseConfig.SUMMARY_VECTOR_FIELD, name: databaseConfig.SUMMARY_VECTOR_INDEX_NAME }
  ];

  /**
   * Constructor with dependency injection.
   */
  constructor(@inject(TOKENS.MongoClient) private readonly mongoClient: MongoClient) {
    this.db = this.mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.sourcesCollection = this.db.collection(databaseConfig.SOURCES_COLLECTION_NAME);
    this.appSummariesCollection = this.db.collection(databaseConfig.SUMMARIES_COLLECTION_NAME);
  }

  /**
   * Execute the task - initializes database schema.
   */
  async execute(): Promise<void> {
    await this.ensureCollectionsReady(databaseConfig.DEFAULT_VECTOR_DIMENSIONS);
  }

  /**
   * Ensures that the necessary collections and indexes are ready in the database.
   */
  async ensureCollectionsReady(numDimensions: number) {
    await this.createCollectionWithValidator(
      this.sourcesCollection.collectionName,
      sourceSchema.getJSONSchema(),
    );
    await this.createCollectionWithValidator(
      this.appSummariesCollection.collectionName,
      appSummarySchema.getJSONSchema(),
    );
    await this.createStandardIndexIfNotExists(this.sourcesCollection, {
      projectName: 1,
      type: 1,
      "summary.classpath": 1,
    });
    await this.createSourcesVectorSearchIndexes(numDimensions);
    await this.createStandardIndexIfNotExists(this.appSummariesCollection, { projectName: 1 });
  }

  /**
   * Creates a collection with a JSON schema validator if it doesn't already exist.
   */
  private async createCollectionWithValidator(
    collectionName: string,
    jsonSchema: ReturnType<typeof sourceSchema.getJSONSchema>,
  ): Promise<void> {
    try {
      const collections = await this.db.listCollections({ name: collectionName }).toArray();
      const validationOptions = {
        validator: { $jsonSchema: jsonSchema },
        validationLevel: "strict",
        validationAction: "error",
      };

      if (collections.length === 0) {
        await this.db.createCollection(collectionName, validationOptions);
        console.log(
          `Created collection '${this.db.databaseName}.${collectionName}' with JSON schema validator`,
        );
      } else {
        await this.db.command({ collMod: collectionName, ...validationOptions });
        console.log(
          `Updated JSON schema validator for collection '${this.db.databaseName}.${collectionName}'`,
        );
      }
    } catch (error: unknown) {
      logErrorMsgAndDetail(
        `Failed to create or update collection '${collectionName}' with validator`,
        error,
      );
    }
  }

  /**
   * Create Atlas Vector Search indexes for sources collection.
   */
  private async createSourcesVectorSearchIndexes(numDimensions: number): Promise<void> {
    let unknownErrorOccurred = false;
    const vectorSearchIndexes = this.vectorIndexConfigs.map(config =>
      this.createFileContentVectorIndexDefinition(config.name, config.field, numDimensions)
    );

    try {
      await this.sourcesCollection.createSearchIndexes(vectorSearchIndexes);
    } catch (error: unknown) {
      if (!(error instanceof MongoServerError && error.code === MONGODB_DUPLICATE_KEY_ERROR_CODE)) {
        logErrorMsgAndDetail(
          `Issue when creating Vector Search indexes, therefore you must create these Vector Search indexes manually (see README) for the MongoDB database collection: '${this.sourcesCollection.dbName}.${this.sourcesCollection.collectionName}'`,
          error,
        );
        unknownErrorOccurred = true;
      }
    }

    if (!unknownErrorOccurred) {
      console.log(
        `Ensured Vector Search indexes exist for the MongoDB database collection: '${this.sourcesCollection.dbName}.${this.sourcesCollection.collectionName}'`,
      );
    }
  }

  /**
   * Create a normal MongoDB collection index if it doesn't exist.
   */
  private async createStandardIndexIfNotExists(
    collection: Collection,
    indexSpec: IndexSpecification,
    isUnique = false,
  ): Promise<void> {
    await collection.createIndex(indexSpec, { unique: isUnique });
    console.log(
      `Ensured normal indexes exist for the MongoDB database collection: '${collection.dbName}.${collection.collectionName}'`,
    );
  }

  /**
   * Create a vector search index with a project and file type filter for a particular metadata
   * field extracted from a file.
   */
  private createFileContentVectorIndexDefinition(indexName: string, fieldToIndex: string, numDimensions: number) {
    const filters = [
      {
        type: "filter" as const,
        path: "projectName",
      },
      {
        type: "filter" as const,
        path: "type",
      },
    ];

    return createVectorSearchIndexDefinition(
      indexName,
      fieldToIndex,
      numDimensions,
      databaseConfig.VECTOR_SIMILARITY_TYPE,
      databaseConfig.VECTOR_QUANTIZATION_TYPE,
      filters,
    );
  }
}
