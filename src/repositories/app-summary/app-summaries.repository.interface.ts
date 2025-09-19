import {
  AppSummaryRecordWithId,
  PartialAppSummaryRecord,
  AppSummaryRecord,
} from "./app-summaries.model";

/**
 * Interface for the App Summaries repository
 */
export interface AppSummariesRepository {
  /**
   * Create or replace an app summary record
   */
  createOrReplaceAppSummary(record: AppSummaryRecord): Promise<void>;

  /**
   * Update an existing app summary record
   */
  updateAppSummary(projectName: string, updates: PartialAppSummaryRecord): Promise<void>;

  /**
   * Get specific field data from app summary
   */
  getProjectAppSummaryField<K extends keyof AppSummaryRecordWithId>(
    projectName: string,
    fieldName: K,
  ): Promise<AppSummaryRecordWithId[K] | null>;

  /**
   * Get multiple fields data from app summary in a single query
   */
  getProjectAppSummaryFields<K extends keyof AppSummaryRecordWithId>(
    projectName: string,
    fieldNames: K[],
  ): Promise<Pick<AppSummaryRecordWithId, K> | null>;

  /**
   * Get the JSON schema for collection validation
   */
  getCollectionValidationSchema(): object;
}
