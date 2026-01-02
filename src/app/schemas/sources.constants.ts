/**
 * MongoDB field path constants for source documents.
 *
 * This file provides a shared location for field constants that are used by
 * both the repository layer (sources.model.ts) and the database configuration
 * (database.config.ts) without creating a cross-layer dependency.
 *
 * Use these constants instead of hardcoded strings when creating indexes or queries.
 */
export const SOURCE_FIELDS = {
  // Top-level fields
  PROJECT_NAME: "projectName",
  FILEPATH: "filepath",
  TYPE: "type",
  CANONICAL_TYPE: "canonicalType",

  // Summary nested fields (dot notation for MongoDB)
  SUMMARY_NAMESPACE: "summary.namespace",
  SUMMARY_PUBLIC_FUNCTIONS: "summary.publicFunctions",
  SUMMARY_INTEGRATION_POINTS: "summary.integrationPoints",
  SUMMARY_CODE_QUALITY_FILE_SMELLS: "summary.codeQualityMetrics.fileSmells",
  SUMMARY_DB_INTEGRATION: "summary.databaseIntegration",
  SUMMARY_DB_INTEGRATION_MECHANISM: "summary.databaseIntegration.mechanism",

  // Vector fields
  CONTENT_VECTOR: "contentVector",
  SUMMARY_VECTOR: "summaryVector",
} as const;
