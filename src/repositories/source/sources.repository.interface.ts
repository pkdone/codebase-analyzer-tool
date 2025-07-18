import { Double } from "mongodb";
import {
  SourceRecord,
  ProjectedSourceMetataContentAndSummary,
  ProjectedSourceFilePathAndSummary,
  ProjectedSourceSummaryFields,
  ProjectedDatabaseIntegrationFields,
  ProjectedFileTypesCountAndLines,
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
    fileTypes: string[],
  ): Promise<ProjectedDatabaseIntegrationFields[]>;

  /**
   * Get stored procedures and triggers information for a project
   */
  getProjectStoredProceduresAndTriggers(
    projectName: string,
    fileTypes: string[],
  ): Promise<ProjectedSourceFilePathAndSummary[]>;

  /**
   * Perform vector search on source file content
   */
  vectorSearchProjectSourcesRawContent(
    projectName: string,
    fileType: string,
    queryVector: Double[],
    numCandidates: number,
    limit: number,
  ): Promise<ProjectedSourceMetataContentAndSummary[]>;

  /**
   * Get file paths for a specific project (used for testing)
   */
  getProjectFilesPaths(projectName: string): Promise<string[]>;

  /**
   * Get file count for a project
   */
  getProjectFilesCount(projectName: string): Promise<number>;

  /**
   * Get total lines of code for a project
   */
  getProjectTotalLinesOfCode(projectName: string): Promise<number>;

  /**
   * Get files count and lines of code count for each file type for a project
   */
  getProjectFileTypesCountAndLines(projectName: string): Promise<ProjectedFileTypesCountAndLines[]>;
}
