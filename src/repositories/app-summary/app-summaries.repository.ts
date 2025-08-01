import { injectable, inject } from "tsyringe";
import { MongoClient, Collection } from "mongodb";
import { AppSummariesRepository } from "./app-summaries.repository.interface";
import {
  AppSummaryRecordWithId,
  ProjectedAppSummaryDescAndLLMProvider,
  PartialAppSummaryRecord,
  AppSummaryRecord,
} from "./app-summaries.model";
import { TOKENS } from "../../di/tokens";
import { databaseConfig } from "../../config/database.config";
import { logMongoValidationErrorIfPresent } from "../../common/mdb/mdb-utils";

/**
 * MongoDB implementation of the App Summaries repository
 */
@injectable()
export default class AppSummariesRepositoryImpl implements AppSummariesRepository {
  // Protected field accessible by subclasses
  protected readonly collection: Collection<AppSummaryRecordWithId>;

  /**
   * Constructor.
   */
  constructor(@inject(TOKENS.MongoClient) mongoClient: MongoClient) {
    const db = mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.collection = db.collection<AppSummaryRecordWithId>(
      databaseConfig.SUMMARIES_COLLECTION_NAME,
    );
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
   * Get app summary info for reporting (description and LLM provider)
   */
  async getProjectAppSummaryDescAndLLMProvider(
    projectName: string,
  ): Promise<ProjectedAppSummaryDescAndLLMProvider | null> {
    const query = { projectName };
    const options = {
      projection: { _id: 0, appDescription: 1, llmProvider: 1 },
    };
    return await this.collection.findOne<ProjectedAppSummaryDescAndLLMProvider>(query, options);
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
    fieldNames: K[],
  ): Promise<Pick<AppSummaryRecordWithId, K> | null> {
    if (fieldNames.length === 0) return null;
    const query = { projectName };
    const projection = Object.fromEntries([
      ["_id", 0],
      ...fieldNames.map((fieldName) => [fieldName, 1]),
    ]) as Record<string, number>;
    const options = { projection };
    return await this.collection.findOne<Pick<AppSummaryRecordWithId, K>>(query, options);
  }
}
