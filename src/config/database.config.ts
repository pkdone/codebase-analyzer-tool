/**
 * Database configuration
 */
export const databaseConfig = {
  DEFAULT_MONGO_SVC: "default",
  CODEBASE_DB_NAME: "codebase-analyzed",
  SOURCES_COLLCTN_NAME: "sources",
  SUMMARIES_COLLCTN_NAME: "appsummaries",
  CONTENT_VECTOR_FIELD: "contentVector",
  SUMMARY_VECTOR_FIELD: "summaryVector",
  CONTENT_VECTOR_INDEX_NAME: "contentVector_vector_index",
  SUMMARY_VECTOR_INDEX_NAME: "summaryVector_vector_index",
  DEFAULT_VECTOR_DIMENSIONS_AMOUNT: 1536,
  VECTOR_SIMILARITY_TYPE: "euclidean", // euclidean | cosine | dotProduct
  VECTOR_QUANTIZATION_TYPE: "scalar", // scalar | binary
} as const;
