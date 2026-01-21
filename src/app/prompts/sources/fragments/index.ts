/**
 * Central export for all source prompt fragments.
 * This module aggregates fragments from language-specific, file-type-specific,
 * and feature-based modules organized into subfolders.
 */

// Type exports
export type { LanguageSpecificFragments } from "../sources.types";

// Feature-based fragments (cross-cutting concerns)
export {
  COMMON_FRAGMENTS,
  CODE_QUALITY_FRAGMENTS,
  DB_INTEGRATION_FRAGMENTS,
  INTEGRATION_POINTS_FRAGMENTS,
  SCHEDULED_JOBS_FRAGMENTS,
  BASE_FRAGMENTS,
  MECHANISM_DESCRIPTIONS,
  DEPENDENCY_EXTRACTION_FRAGMENTS,
  COMPOSITES,
} from "./features";

// Language-specific fragments
export {
  JAVA_SPECIFIC_FRAGMENTS,
  JAVASCRIPT_SPECIFIC_FRAGMENTS,
  CSHARP_SPECIFIC_FRAGMENTS,
  PYTHON_SPECIFIC_FRAGMENTS,
  PYTHON_COMPLEXITY_METRICS,
  RUBY_SPECIFIC_FRAGMENTS,
  C_SPECIFIC_FRAGMENTS,
  CPP_SPECIFIC_FRAGMENTS,
} from "./languages";

// File-type-specific fragments
export {
  SQL_SPECIFIC_FRAGMENTS,
  XML_SPECIFIC_FRAGMENTS,
  JSP_SPECIFIC_FRAGMENTS,
  SHELL_SCRIPT_SPECIFIC_FRAGMENTS,
  BATCH_SCRIPT_SPECIFIC_FRAGMENTS,
  JCL_SPECIFIC_FRAGMENTS,
} from "./languages";
