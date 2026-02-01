/**
 * Barrel export for capture module.
 *
 * This module provides functionality for capturing and summarizing source files
 * from a codebase into the database for analysis.
 */

// Core services
export { default as CodebaseIngestionService } from "./codebase-ingestion.service";
export {
  FileSummarizerService,
  type SourceSummaryType,
  type PartialSourceSummaryType,
} from "./file-summarizer.service";

// Utilities - File type mapping
export { getCanonicalFileType } from "./utils";

// Types - Canonical file types
export { CANONICAL_FILE_TYPES, type CanonicalFileType } from "../../schemas/canonical-file-types";
