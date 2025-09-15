import { inject } from "tsyringe";
import { MongoClient, Collection, Document } from "mongodb";
import { TOKENS } from "../di/tokens";
import { databaseConfig } from "../config/database.config";

/**
 * Base repository class that provides common MongoDB setup.
 * This eliminates duplication of MongoClient injection and collection setup
 * across repository implementations.
 */
export abstract class BaseRepository<T extends Document> {
  protected readonly collection: Collection<T>;

  /**
   * Constructor with MongoDB client injection and collection setup.
   * 
   * @param mongoClient The MongoDB client instance
   * @param collectionName The name of the MongoDB collection
   */
  constructor(
    @inject(TOKENS.MongoClient) mongoClient: MongoClient,
    collectionName: string,
  ) {
    const db = mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.collection = db.collection<T>(collectionName);
  }

  /**
   * Abstract method for getting the JSON schema for collection validation.
   * Each repository implementation should provide its own validation schema.
   */
  abstract getCollectionValidationSchema(): object;
}
