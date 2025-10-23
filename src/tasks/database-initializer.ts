import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { MongoClient, Db, Collection, IndexSpecification, MongoServerError } from "mongodb";
import { TOKENS } from "../tokens";
import { databaseConfig } from "../config/database.config";
import { logErrorMsgAndDetail } from "../common/utils/logging";
import type { SourcesRepository } from "../repositories/sources/sources.repository.interface";
import type { AppSummariesRepository } from "../repositories/app-summaries/app-summaries.repository.interface";
import {
  VectorSearchFilter,
  createVectorSearchIndexDefinition,
} from "../common/mongodb/mdb-index-utils";
import {
  MONGODB_DUPLICATE_OBJ_ERROR_CODES,
  MONGODB_NAMESPACE_EXISTS_ERROR_CODE,
} from "../common/mongodb/mdb.constants";

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
   */
  constructor(
    @inject(TOKENS.MongoClient) private readonly mongoClient: MongoClient,
    @inject(TOKENS.DatabaseName) dbName: string,
    @inject(TOKENS.SourcesRepository) private readonly sourcesRepository: SourcesRepository,
    @inject(TOKENS.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
  ) {
    this.db = this.mongoClient.db(dbName);
    this.sourcesCollection = this.db.collection(databaseConfig.SOURCES_COLLECTION_NAME);
    this.appSummariesCollection = this.db.collection(databaseConfig.SUMMARIES_COLLECTION_NAME);
  }

  /**
   * Initializes the complete database schema including collections, validators, and indexes.
   */
  async initializeDatabaseSchema(numDimensions: number): Promise<void> {
    await this.createCollectionWithValidator(
      this.sourcesCollection.collectionName,
      this.sourcesRepository.getCollectionValidationSchema(),
    );
    await this.createCollectionWithValidator(
      this.appSummariesCollection.collectionName,
      this.appSummariesRepository.getCollectionValidationSchema(),
    );
    await this.createStandardIndexIfNotExists(this.sourcesCollection, {
      projectName: 1,
      "summary.namespace": 1,
    });
    await this.createStandardIndexIfNotExists(this.sourcesCollection, {
      projectName: 1,
      "summary.publicMethods": 1,
    });
    await this.createStandardIndexIfNotExists(this.sourcesCollection, {
      projectName: 1,
      filepath: 1,
    });
    // Add index to optimize graphLookup performance (albeit doesn't query on projectid too)
    await this.createStandardIndexIfNotExists(this.sourcesCollection, {
      "summary.namespace": 1,
    });
    await this.createSourcesVectorSearchIndexes(numDimensions);
    await this.createStandardIndexIfNotExists(this.appSummariesCollection, { projectName: 1 });
  }

  /**
   * Creates a collection with a JSON schema validator if it doesn't already exist.
   */
  private async createCollectionWithValidator(
    collectionName: string,
    jsonSchema: object,
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
          logErrorMsgAndDetail(
            `Failed to update validator for existing collection '${collectionName}'`,
            updateError,
          );
        }
      } else {
        // Handle other errors (permissions, invalid schema, etc.)
        logErrorMsgAndDetail(
          `Failed to create collection '${collectionName}' with validator`,
          error,
        );
      }
    }
  }

  /**
   * Create Atlas Vector Search indexes for sources collection.
   */
  private async createSourcesVectorSearchIndexes(numDimensions: number): Promise<void> {
    let unknownErrorOccurred = false;
    const vectorSearchIndexes = databaseConfig.VECTOR_INDEX_CONFIGS.map((config) =>
      this.createProjectScopedVectorIndexDefinition(config.name, config.field, numDimensions),
    );

    try {
      await this.sourcesCollection.createSearchIndexes(vectorSearchIndexes);
    } catch (error: unknown) {
      // Check if this is an expected duplicate error that we can safely ignore
      if (
        error instanceof MongoServerError &&
        (MONGODB_DUPLICATE_OBJ_ERROR_CODES as readonly number[]).includes(Number(error.code))
      ) {
        // Expected duplicate error - indexes already exist, which is fine
      } else {
        // Unexpected error - log it for investigation
        logErrorMsgAndDetail(
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
