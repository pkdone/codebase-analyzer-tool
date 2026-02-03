import { AppSummariesRepository } from "./app-summaries.repository.interface";
import { AppSummaryRecordWithId, PartialAppSummaryRecord } from "./app-summaries.model";
import type { DatabaseConfigType } from "../../config/database.config";
import { BaseRepository } from "../base/base-repository";
import { MongoClient } from "mongodb";
import { coreTokens, configTokens } from "../../di/tokens";
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
   *
   * @param mongoClient - MongoDB client instance (injected)
   * @param dbName - Database name (injected)
   * @param dbConfig - Database configuration (injected)
   */
  constructor(
    @inject(coreTokens.MongoClient) mongoClient: MongoClient,
    @inject(coreTokens.DatabaseName) dbName: string,
    @inject(configTokens.DatabaseConfig) dbConfig: DatabaseConfigType,
  ) {
    super(mongoClient, dbName, dbConfig.SUMMARIES_COLLECTION_NAME);
  }

  /**
   * Create or replace an app summary record.
   * Uses upsert with $set to safely update only the provided fields,
   * preserving any existing fields not included in the partial record.
   */
  async createOrReplaceAppSummary(record: PartialAppSummaryRecord): Promise<void> {
    await this.safeUpdate(
      { projectName: record.projectName } as Partial<AppSummaryRecordWithId>,
      { $set: record },
      { upsert: true },
    );
  }

  /**
   * Update an existing app summary record
   */
  async updateAppSummary(projectName: string, updates: PartialAppSummaryRecord): Promise<void> {
    await this.safeUpdate({ projectName } as Partial<AppSummaryRecordWithId>, { $set: updates });
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
}
