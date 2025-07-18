import {
  AppSummaryRecord,
  ProjectedAppSummaryDescAndLLMProvider,
  PartialAppSummaryRecord,
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
   * Get app summary info for reporting (description and LLM provider)
   */
  getProjectAppSummaryDescAndLLMProvider(
    projectName: string,
  ): Promise<ProjectedAppSummaryDescAndLLMProvider | null>;

  /**
   * Get specific field data from app summary
   */
  getProjectAppSummaryField<K extends keyof AppSummaryRecord>(
    projectName: string,
    fieldName: K,
  ): Promise<AppSummaryRecord[K] | null>;
}
