/**
 * Central export for all source prompt fragments.
 * This module aggregates fragments from language-specific and file-type-specific modules.
 */

// Common fragments
export {
  COMMON_FRAGMENTS,
  CODE_QUALITY_FRAGMENTS,
  DB_INTEGRATION_FRAGMENTS,
  INTEGRATION_POINTS_FRAGMENTS,
  SCHEDULED_JOBS_FRAGMENTS,
  BASE_FRAGMENTS,
} from "./common.fragments";

// Dependency extraction fragments
export { DEPENDENCY_EXTRACTION_FRAGMENTS } from "./dependency-extraction.fragments";

// Language-specific fragments
export { JAVA_SPECIFIC_FRAGMENTS } from "./java.fragments";
export { JAVASCRIPT_SPECIFIC_FRAGMENTS } from "./javascript.fragments";
export { CSHARP_SPECIFIC_FRAGMENTS } from "./csharp.fragments";
export { PYTHON_SPECIFIC_FRAGMENTS, PYTHON_COMPLEXITY_METRICS } from "./python.fragments";
export { RUBY_SPECIFIC_FRAGMENTS } from "./ruby.fragments";
export { C_SPECIFIC_FRAGMENTS } from "./c.fragments";
export { CPP_SPECIFIC_FRAGMENTS } from "./cpp.fragments";

// File-type-specific fragments
export { SQL_SPECIFIC_FRAGMENTS } from "./sql.fragments";
export { XML_SPECIFIC_FRAGMENTS } from "./xml.fragments";
export { JSP_SPECIFIC_FRAGMENTS } from "./jsp.fragments";
export { SHELL_SCRIPT_SPECIFIC_FRAGMENTS } from "./shell-script.fragments";
export { BATCH_SCRIPT_SPECIFIC_FRAGMENTS } from "./batch-script.fragments";
export { JCL_SPECIFIC_FRAGMENTS } from "./jcl.fragments";

// Composites (pre-grouped instruction sets)
export { COMPOSITES } from "./composites";
