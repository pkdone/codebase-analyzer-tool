import { injectable, inject } from "tsyringe";
import { MongoClient, Collection } from "mongodb";
import { AppSummariesRepository } from "./app-summaries.repository.interface";
import {
  AppSummaryRecord,
  ProjectedAppSummaryDescAndLLMProvider,
  PartialAppSummaryRecord,
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
  protected readonly collection: Collection<AppSummaryRecord>;

  /**
   * Constructor.
   */
  constructor(@inject(TOKENS.MongoClient) mongoClient: MongoClient) {
    const db = mongoClient.db(databaseConfig.CODEBASE_DB_NAME);
    this.collection = db.collection<AppSummaryRecord>(databaseConfig.SUMMARIES_COLLCTN_NAME);
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
   *
   * The return type is inferred based on the requested field name, and will be the exact type
   * of that field (including undefined if applicable) or `null` if the record is not found.
   *
   * - If the field exists but is `undefined`, `undefined` is returned.
   * - If the record does not exist, `null` is returned.
   *
   * Usage examples:
   *   getProjectAppSummaryField(projectName, 'llmProvider') // Promise<string | null>
   *   getProjectAppSummaryField(projectName, 'businessProcesses') // Promise<AppSummaryNameDescArray | null>
   *   getProjectAppSummaryField(projectName, 'appDescription') // Promise<string | null>
   *
   * @param projectName - The name of the project.
   * @param fieldName - The field to retrieve from the app summary record.
   * @returns The value of the requested field, or null if the record is not found.
   */
  async getProjectAppSummaryField<K extends keyof AppSummaryRecord>(
    projectName: string,
    fieldName: K,
  ): Promise<AppSummaryRecord[K] | null> {
    const query = { projectName };
    const options = {
      projection: { _id: 0, [fieldName]: 1 },
    };
    const record = await this.collection.findOne<Pick<AppSummaryRecord, K>>(query, options);
    // Use optional chaining and nullish coalescing to correctly handle missing records or fields.
    // This returns the field's value (which could be undefined) or null if the record/field doesn't exist.
    return record?.[fieldName] ?? null;
  }
}
