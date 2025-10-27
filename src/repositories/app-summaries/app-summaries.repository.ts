import { AppSummariesRepository } from "./app-summaries.repository.interface";
import {
  AppSummaryRecordWithId,
  PartialAppSummaryRecord,
  AppSummaryRecord,
} from "./app-summaries.model";
import { databaseConfig } from "../../config/database.config";
import { logMongoValidationErrorIfPresent } from "../../common/mongodb/mdb-error-utils";
import { getJSONSchema } from "./app-summaries.model";
import { BaseRepository } from "../base-repository";
import { MongoClient } from "mongodb";
import { coreTokens } from "../../di/core.tokens";
import { inject, injectable } from "tsyringe";

/**
 * MongoDB implementation of the App Summary repository
 */
@injectable()
export default class AppSummariesRepositoryImpl
  extends BaseRepository<AppSummaryRecordWithId>
  implements AppSummariesRepository
{
  /**
   * Constructor.
   */
  constructor(
    @inject(coreTokens.MongoClient) mongoClient: MongoClient,
    @inject(coreTokens.DatabaseName) dbName: string,
  ) {
    super(mongoClient, dbName, databaseConfig.SUMMARIES_COLLECTION_NAME);
  }

  /**
   * Create or replace an app summary record
   */
  async createOrReplaceAppSummary(record: AppSummaryRecord): Promise<void> {
    try {
      await this.collection.replaceOne({ projectName: record.projectName }, record, {
        upsert: true,
      });
    } catch (error: unknown) {
      logMongoValidationErrorIfPresent(error);
      throw error;
    }
  }

  /**
   * Update an existing app summary record
   */
  async updateAppSummary(projectName: string, updates: PartialAppSummaryRecord): Promise<void> {
    try {
      await this.collection.updateOne({ projectName }, { $set: updates });
    } catch (error: unknown) {
      logMongoValidationErrorIfPresent(error);
      throw error;
    }
  }

  /**
   * Retrieves the value of a specific field from an app summary record for the given project.
   */
  async getProjectAppSummaryField<K extends keyof AppSummaryRecordWithId>(
    projectName: string,
    fieldName: K,
  ): Promise<AppSummaryRecordWithId[K] | null> {
    const result = await this.getProjectAppSummaryFields(projectName, [fieldName]);
    return result?.[fieldName] ?? null;
  }

  /**
   * Retrieves multiple fields from an app summary record for the given project in a single query.
   */
  async getProjectAppSummaryFields<K extends keyof AppSummaryRecordWithId>(
    projectName: string,
    fieldNames: readonly K[],
  ): Promise<Pick<AppSummaryRecordWithId, K> | null> {
    if (fieldNames.length === 0) return null;
    const query = { projectName };
    const projection = {
      _id: 0,
      ...Object.fromEntries(fieldNames.map((fieldName) => [fieldName, 1])),
    };
    const options = { projection };
    return await this.collection.findOne<Pick<AppSummaryRecordWithId, K>>(query, options);
  }

  /**
   * Get the JSON schema for collection validation
   */
  getCollectionValidationSchema(): Record<string, unknown> {
    return getJSONSchema();
  }
}
