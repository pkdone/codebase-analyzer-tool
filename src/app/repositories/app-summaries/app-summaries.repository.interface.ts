import { AppSummaryRecordWithId, PartialAppSummaryRecord } from "./app-summaries.model";

/**
 * Interface for the App Summary repository
 */
export interface AppSummariesRepository {
  /**
   * Create or replace an app summary record.
   * Uses upsert with $set to safely update only the provided fields,
   * preserving any existing fields not included in the partial record.
   */
  createOrReplaceAppSummary(record: PartialAppSummaryRecord): Promise<void>;

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
    fieldNames: readonly K[],
  ): Promise<Pick<AppSummaryRecordWithId, K> | null>;
}
