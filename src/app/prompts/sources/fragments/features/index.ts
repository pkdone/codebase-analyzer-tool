/**
 * Feature-based instruction fragments (cross-cutting concerns).
 */

// Common fragments
export {
  COMMON_FRAGMENTS,
  INTEGRATION_POINTS_FRAGMENTS,
  SCHEDULED_JOBS_FRAGMENTS,
  BASE_FRAGMENTS,
  MECHANISM_DESCRIPTIONS,
} from "./common.fragments";

// Code quality fragments
export { CODE_QUALITY_FRAGMENTS } from "./code-quality.fragments";

// Database integration fragments
export { DB_INTEGRATION_FRAGMENTS } from "./database.fragments";

// Dependency extraction
export { DEPENDENCY_EXTRACTION_FRAGMENTS } from "./dependency-extraction.fragments";

// Composites (pre-grouped instruction sets)
export { COMPOSITES } from "./composites";
