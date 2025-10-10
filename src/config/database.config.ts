/**
 * Database configuration
 */
export const databaseConfig = {
  DEFAULT_MONGO_SERVICE_ID: "default",
  CODEBASE_DB_NAME: "codebase-analyzed",
  SOURCES_COLLECTION_NAME: "sources",
  SUMMARIES_COLLECTION_NAME: "appsummaries",
  CONTENT_VECTOR_FIELD: "contentVector",
  SUMMARY_VECTOR_FIELD: "summaryVector",
  CONTENT_VECTOR_INDEX_NAME: "contentVector_vector_index",
  SUMMARY_VECTOR_INDEX_NAME: "summaryVector_vector_index",
  DEFAULT_VECTOR_DIMENSIONS: 1536,
  VECTOR_SIMILARITY_TYPE: "euclidean", // euclidean | cosine | dotProduct
  VECTOR_QUANTIZATION_TYPE: "scalar", // scalar | binary
  DEPENDENCY_GRAPH_MAX_DEPTH: 1, // Maximum depth for dependency graph traversal
  DEPENDENCY_GRAPH_RESULT_LIMIT: 5, // Maximum number of top-level dependencies to return
} as const;
