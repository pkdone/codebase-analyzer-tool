/**
 * Barrel export for schema-specific post-parse transformations.
 * These transformations are aware of the sourceSummarySchema structure.
 */

export {
  normalizeDatabaseIntegrationArray,
  fixParameterPropertyNameTypos,
  fixMissingRequiredFields,
  fixParametersFieldType,
} from "./source-schema-transforms.js";
