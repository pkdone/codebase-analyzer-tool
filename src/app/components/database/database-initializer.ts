import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { MongoClient, Db, Collection, MongoServerError, type IndexSpecification } from "mongodb";
import type { JsonSchema7Type } from "zod-to-json-schema";
import { coreTokens, configTokens } from "../../di/tokens";
import {
  STANDARD_INDEX_CONFIGS,
  COLLECTION_TYPES,
  type CollectionType,
  type DatabaseConfigType,
} from "./database.config";
import { logErr } from "../../../common/utils/logging";
import { getJSONSchema as getSourcesJSONSchema } from "../../repositories/sources/sources.model";
import { SOURCE_FIELDS } from "../../schemas/sources.constants";
import { getJSONSchema as getAppSummariesJSONSchema } from "../../repositories/app-summaries/app-summaries.model";
import {
  VectorSearchFilter,
  createVectorSearchIndexDefinition,
} from "../../../common/mongodb/mdb-index-utils";
import {
  MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET,
  MONGODB_NAMESPACE_EXISTS_ERROR_CODE,
} from "../../../common/mongodb/mdb.constants";

/**
 * Component responsible for database schema initialization and management.
 * Handles all DDL operations including index creation for both collections.
 *
 * This component encapsulates the core database initialization business logic
 * and can be used by tasks or other components that need to ensure the database
 * schema is properly set up.
 */
@injectable()
export class DatabaseInitializer {
  private readonly db: Db;
  private readonly sourcesCollection: Collection;
  private readonly appSummariesCollection: Collection;

  /**
   * Constructor with dependency injection.
   * @param mongoClient - MongoDB client instance
   * @param dbName - Database name for the application
   * @param dbConfig - Database configuration for collection names and index settings
   */
  constructor(
    @inject(coreTokens.MongoClient) private readonly mongoClient: MongoClient,
    @inject(coreTokens.DatabaseName) dbName: string,
    @inject(configTokens.DatabaseConfig) private readonly dbConfig: DatabaseConfigType,
  ) {
    this.db = this.mongoClient.db(dbName);
    this.sourcesCollection = this.db.collection(this.dbConfig.SOURCES_COLLECTION_NAME);
    this.appSummariesCollection = this.db.collection(this.dbConfig.SUMMARIES_COLLECTION_NAME);
  }

  /**
   * Initializes the complete database schema including collections, validators, and indexes.
   */
  async initializeDatabaseSchema(numDimensions: number): Promise<void> {
    await this.createCollectionWithValidator(
      this.sourcesCollection.collectionName,
      getSourcesJSONSchema(),
    );
    await this.createCollectionWithValidator(
      this.appSummariesCollection.collectionName,
      getAppSummariesJSONSchema(),
    );

    // Create standard indexes from centralized configuration
    for (const config of STANDARD_INDEX_CONFIGS) {
      const collection = this.getCollectionByType(config.collection);
      await this.createStandardIndexIfNotExists(collection, config.spec);
    }

    await this.ensureSourcesVectorSearchIndexes(numDimensions);
  }

  /**
   * Maps a collection type identifier to the actual MongoDB collection.
   */
  private getCollectionByType(collectionType: CollectionType): Collection {
    switch (collectionType) {
      case COLLECTION_TYPES.SOURCES:
        return this.sourcesCollection;
      case COLLECTION_TYPES.SUMMARIES:
        return this.appSummariesCollection;
    }
  }

  /**
   * Creates a collection with a JSON schema validator if it doesn't already exist.
   */
  private async createCollectionWithValidator(
    collectionName: string,
    jsonSchema: JsonSchema7Type,
  ): Promise<void> {
    const validationOptions = {
      validator: { $jsonSchema: jsonSchema },
      validationLevel: "strict",
      validationAction: "error",
    };

    try {
      // Try to create the collection first (more efficient for new collections)
      await this.db.createCollection(collectionName, validationOptions);
      console.log(
        `Created collection '${this.db.databaseName}.${collectionName}' with JSON schema validator`,
      );
    } catch (error: unknown) {
      // If collection already exists (NamespaceExists), update the validator
      if (error instanceof MongoServerError && error.code === MONGODB_NAMESPACE_EXISTS_ERROR_CODE) {
        try {
          await this.db.command({ collMod: collectionName, ...validationOptions });
          console.log(
            `Updated JSON schema validator for collection '${this.db.databaseName}.${collectionName}'`,
          );
        } catch (updateError: unknown) {
          logErr(
            `Failed to update validator for existing collection '${collectionName}'`,
            updateError,
          );
        }
      } else {
        // Handle other errors (permissions, invalid schema, etc.)
        logErr(`Failed to create collection '${collectionName}' with validator`, error);
      }
    }
  }

  /**
   * Create Atlas Vector Search indexes for sources collection.
   */
  private async ensureSourcesVectorSearchIndexes(numDimensions: number): Promise<void> {
    let unknownErrorOccurred = false;
    const vectorSearchIndexes = this.dbConfig.VECTOR_INDEX_CONFIGS.map((config) =>
      this.createProjectScopedVectorIndexDefinition(config.name, config.field, numDimensions),
    );

    try {
      await this.sourcesCollection.createSearchIndexes(vectorSearchIndexes);
    } catch (error: unknown) {
      // Check if this is an expected duplicate error that we can safely ignore
      if (
        error instanceof MongoServerError &&
        MONGODB_DUPLICATE_OBJ_ERROR_CODES_SET.has(Number(error.code))
      ) {
        // Expected duplicate error - indexes already exist, which is fine
      } else {
        // Unexpected error - log it for investigation
        logErr(
          `Issue when creating Vector Search indexes for the MongoDB database collection: '${this.sourcesCollection.dbName}.${this.sourcesCollection.collectionName}'`,
          error,
        );
        unknownErrorOccurred = true;
      }
    }

    if (!unknownErrorOccurred) {
      console.log(
        `Ensured Vector Search index exists for the MongoDB database collection: '${this.sourcesCollection.dbName}.${this.sourcesCollection.collectionName}',`,
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
      `Ensured regular index exists for the MongoDB database collection: '${collection.dbName}.${collection.collectionName}'`,
    );
  }

  /**
   * Create a vector search index with project and file type filters specific to codebase processing.
   */
  private createProjectScopedVectorIndexDefinition(
    indexName: string,
    fieldToIndex: string,
    numDimensions: number,
  ) {
    const filters: VectorSearchFilter[] = [
      {
        type: "filter" as const,
        path: SOURCE_FIELDS.PROJECT_NAME,
      },
      {
        type: "filter" as const,
        path: SOURCE_FIELDS.TYPE,
      },
    ];
    return createVectorSearchIndexDefinition(
      indexName,
      fieldToIndex,
      numDimensions,
      this.dbConfig.VECTOR_SIMILARITY_TYPE,
      this.dbConfig.VECTOR_QUANTIZATION_TYPE,
      filters,
    );
  }
}
