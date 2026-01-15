import {
  ProjectedSourceMetadataContentAndSummary,
  ProjectedSourceFilePathAndSummary,
  ProjectedSourceSummaryFields,
  ProjectedDatabaseIntegrationFields,
  ProjectedIntegrationPointFields,
  ProjectedFileTypesCountAndLines,
  ProjectedFileAndLineStats,
  ProjectedTopComplexFunction,
  ProjectedCodeSmellStatistic,
  ProjectedCodeQualityStatistics,
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
  getProjectSourcesSummariesByFileType(
    projectName: string,
    fileTypes: string[],
  ): Promise<ProjectedSourceSummaryFields[]>;

  /**
   * Get source file summaries for a project filtered by canonical type
   */
  getProjectSourcesSummariesByCanonicalType(
    projectName: string,
    canonicalTypes: string[],
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
  ): Promise<ProjectedSourceMetadataContentAndSummary[]>;

  /**
   * Get file paths for a specific project (used for testing)
   */
  getProjectFilesPaths(projectName: string): Promise<string[]>;

  /**
   * Get file count and total lines of code for a project in a single query
   */
  getProjectFileAndLineStats(projectName: string): Promise<ProjectedFileAndLineStats>;

  /**
   * Get files count and lines of code count for each file type for a project
   */
  getProjectFileTypesCountAndLines(projectName: string): Promise<ProjectedFileTypesCountAndLines[]>;

  /**
   * Get integration points (APIs, queues, topics, SOAP services) for a project
   */
  getProjectIntegrationPoints(projectName: string): Promise<ProjectedIntegrationPointFields[]>;

  /**
   * Get top N most complex functions/methods across the project using aggregation pipeline
   */
  getTopComplexFunctions(
    projectName: string,
    limit: number,
  ): Promise<ProjectedTopComplexFunction[]>;

  /**
   * Get code smell statistics using aggregation pipeline
   */
  getCodeSmellStatistics(projectName: string): Promise<ProjectedCodeSmellStatistic[]>;

  /**
   * Get overall code quality statistics using aggregation pipeline
   */
  getCodeQualityStatistics(projectName: string): Promise<ProjectedCodeQualityStatistics>;
}
