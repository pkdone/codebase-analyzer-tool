/**
 * Barrel export for capture module.
 *
 * This module provides functionality for capturing and summarizing source files
 * from a codebase into the database for analysis.
 */

// Core services
export { default as CodebaseToDBLoader } from "./codebase-to-db-loader";
export {
  FileSummarizerService,
  type SourceSummaryType,
  type PartialSourceSummaryType,
} from "./file-summarizer.service";

// Configuration
export {
  getCanonicalFileType,
  CANONICAL_FILE_TYPES,
  type CanonicalFileType,
} from "./config/file-types.config";
