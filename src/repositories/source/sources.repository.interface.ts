import {
  ProjectedSourceMetataContentAndSummary,
  ProjectedSourceFilePathAndSummary,
  ProjectedSourceSummaryFields,
  ProjectedDatabaseIntegrationFields,
  ProjectedFileTypesCountAndLines,
  ProjectedTopLevelJavaClassDependencies,
  SourceRecord,
} from "./sources.model";

/**
 * Interface for the Sources repository
 */
export interface SourcesRepository {
  /**
   * Insert a source file record into the database
   */
  insertSource(sourceFileData: SourceRecord): Promise<void>;

  /**
   * Delete all source files for a specific project
   */
  deleteSourcesByProject(projectName: string): Promise<void>;

  /**
   * Check if a source file already exists for a project
   */
  doesProjectSourceExist(projectName: string, filepath: string): Promise<boolean>;

  /**
   * Get source file summaries for a project
   */
  getProjectSourcesSummaries(
    projectName: string,
    fileTypes: string[],
  ): Promise<ProjectedSourceSummaryFields[]>;

  /**
   * Get database integration information for a project
   */
  getProjectDatabaseIntegrations(
    projectName: string,
  ): Promise<ProjectedDatabaseIntegrationFields[]>;

  /**
   * Get stored procedures and triggers information for a project
   */
  getProjectStoredProceduresAndTriggers(
    projectName: string,
  ): Promise<ProjectedSourceFilePathAndSummary[]>;

  /**
   * Perform vector search on source file content
   */
  vectorSearchProjectSourcesRawContent(
    projectName: string,
    queryVector: number[],
    numCandidates: number,
    limit: number,
  ): Promise<ProjectedSourceMetataContentAndSummary[]>;

  /**
   * Get file paths for a specific project (used for testing)
   */
  getProjectFilesPaths(projectName: string): Promise<string[]>;

  /**
   * Get file count and total lines of code for a project in a single query
   */
  getProjectFileAndLineStats(
    projectName: string,
  ): Promise<{ fileCount: number; linesOfCode: number }>;

  /**
   * Get files count and lines of code count for each file type for a project
   */
  getProjectFileTypesCountAndLines(projectName: string): Promise<ProjectedFileTypesCountAndLines[]>;

  /**
   * Get top level Java classes for a project with their full dependency structures.
   * Returns the complete dependency tree for each top-level class.
   */
  getTopLevelJavaClassDependencies(
    projectName: string,
  ): Promise<ProjectedTopLevelJavaClassDependencies[]>;

  /**
   * Get the JSON schema for collection validation
   */
  getCollectionValidationSchema(): object;
}
