import {
  MongoClient,
  Collection,
  Document,
  OptionalUnlessRequiredId,
  Filter,
  UpdateFilter,
  UpdateOptions,
} from "mongodb";
import { logMongoValidationErrorIfPresent } from "../../../common/mongodb/mdb-error-utils";

/**
 * Base repository class providing common MongoDB operations and initialization.
 *
 * This class handles:
 * - Common constructor pattern (MongoClient and dbName injection)
 * - Collection initialization
 * - Safe write operations with error handling
 *
 * Note: @inject decorators are NOT placed on this abstract class.
 * Concrete subclasses must use their own @inject decorators to specify
 * how mongoClient and dbName are injected.
 *
 * @template T - The document type for this repository's collection
 */
export abstract class BaseRepository<T extends Document> {
  protected readonly collection: Collection<T>;

  /**
   * Constructor that initializes the MongoDB collection.
   *
   * @param mongoClient - The MongoDB client instance
   * @param dbName - The database name
   * @param collectionName - The collection name
   */
  constructor(mongoClient: MongoClient, dbName: string, collectionName: string) {
    const db = mongoClient.db(dbName);
    this.collection = db.collection<T>(collectionName);
  }

  /**
   * Safely insert a document with error handling.
   *
   * @param document - The document to insert
   * @throws Re-throws the error after logging validation errors
   */
  protected async safeInsert(document: OptionalUnlessRequiredId<T>): Promise<void> {
    try {
      await this.collection.insertOne(document);
    } catch (error: unknown) {
      logMongoValidationErrorIfPresent(error);
      throw error;
    }
  }

  /**
   * Safely update a document with error handling.
   *
   * @param filter - The filter to find the document
   * @param update - The update operation
   * @param options - Optional update options (e.g., upsert)
   * @throws Re-throws the error after logging validation errors
   */
  protected async safeUpdate(
    filter: Filter<T>,
    update: UpdateFilter<T>,
    options?: UpdateOptions,
  ): Promise<void> {
    try {
      await this.collection.updateOne(filter, update, options);
    } catch (error: unknown) {
      logMongoValidationErrorIfPresent(error);
      throw error;
    }
  }
}
