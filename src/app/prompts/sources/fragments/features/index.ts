/**
 * Feature-based instruction fragments (cross-cutting concerns).
 */

// Common fragments
export {
  COMMON_FRAGMENTS,
  CODE_QUALITY_FRAGMENTS,
  DB_INTEGRATION_FRAGMENTS,
  INTEGRATION_POINTS_FRAGMENTS,
  SCHEDULED_JOBS_FRAGMENTS,
  BASE_FRAGMENTS,
  MECHANISM_DESCRIPTIONS,
} from "./common.fragments";

// Dependency extraction
export { DEPENDENCY_EXTRACTION_FRAGMENTS } from "./dependency-extraction.fragments";

// Composites (pre-grouped instruction sets)
export { COMPOSITES } from "./composites";
