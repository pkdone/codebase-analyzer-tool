import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { MongoClient, Db, Collection, IndexSpecification } from "mongodb";
import { TOKENS } from "../di/tokens";
import { databaseConfig } from "../config/database.config";
import { logErrorMsgAndDetail } from "../common/utils/error-utils";
import { createVectorSearchIndexDefinition } from "../common/mdb/mdb-utils";
import { Service } from "./service.types";
import * as sourceSchema from "../repositories/source/sources.model";
import * as appSummarySchema from "../repositories/app-summary/app-summaries.model";

/**
 * Service responsible for database schema initialization and management.
 * Handles all DDL operations including index creation for both collections.
 */
@injectable()
export class DBInitializerService implements Service {
  private readonly db: Db;
  private readonly sourcesCollection: Collection;
  private readonly appSummariesCollection: Collection;

  /**
   * Constructor with dependency injection.
   */
  constructor(@inject(TOKENS.MongoClient) private readonly mongoClient: MongoClient) {
    this.db = this.mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.sourcesCollection = this.db.collection(databaseConfig.SOURCES_COLLCTN_NAME);
    this.appSummariesCollection = this.db.collection(databaseConfig.SUMMARIES_COLLCTN_NAME);
  }

  /**
   * Execute the service - initializes database schema.
   */
  async execute(): Promise<void> {
    await this.ensureCollectionsReady(databaseConfig.DEFAULT_VECTOR_DIMENSIONS_AMOUNT);
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
    await this.createNormalIndexIfNotExists(this.sourcesCollection, {
      projectName: 1,
      type: 1,
      "summary.classpath": 1,
    });
    await this.createSourcesVectorSearchIndexes(numDimensions);
    await this.createNormalIndexIfNotExists(this.appSummariesCollection, { projectName: 1 });
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
    const vectorSearchIndexes = [];
    vectorSearchIndexes.push(
      this.createFileContentVectorIndexDefinition(
        databaseConfig.CONTENT_VECTOR_FIELD,
        numDimensions,
      ),
    );
    vectorSearchIndexes.push(
      this.createFileContentVectorIndexDefinition(
        databaseConfig.SUMMARY_VECTOR_FIELD,
        numDimensions,
      ),
    );

    try {
      await this.sourcesCollection.createSearchIndexes(vectorSearchIndexes);
    } catch (error: unknown) {
      const isDuplicateIndexError =
        typeof error === "object" &&
        error !== null &&
        Object.hasOwn(error, "codeName") &&
        (error as { codeName: unknown }).codeName === "IndexAlreadyExists";

      if (!isDuplicateIndexError) {
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
  private async createNormalIndexIfNotExists(
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
  private createFileContentVectorIndexDefinition(fieldToIndex: string, numDimensions: number) {
    const indexName =
      fieldToIndex === databaseConfig.CONTENT_VECTOR_FIELD
        ? databaseConfig.CONTENT_VECTOR_INDEX_NAME
        : databaseConfig.SUMMARY_VECTOR_INDEX_NAME;

    const filters = [
      {
        type: "filter",
        path: "projectName",
      },
      {
        type: "filter",
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
