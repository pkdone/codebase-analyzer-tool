/**
 * Database configuration
 */
const CONTENT_VECTOR_FIELD = "contentVector";
const SUMMARY_VECTOR_FIELD = "summaryVector";
const CONTENT_VECTOR_INDEX_NAME = "contentVector_vector_index";
const SUMMARY_VECTOR_INDEX_NAME = "summaryVector_vector_index";

export const databaseConfig = {
  DEFAULT_MONGO_SERVICE_ID: "default",
  CODEBASE_DB_NAME: "codebase-analyzed",
  SOURCES_COLLECTION_NAME: "sources",
  SUMMARIES_COLLECTION_NAME: "appsummaries",
  CONTENT_VECTOR_FIELD,
  SUMMARY_VECTOR_FIELD,
  CONTENT_VECTOR_INDEX_NAME,
  SUMMARY_VECTOR_INDEX_NAME,
  DEFAULT_VECTOR_DIMENSIONS: 1536,
  VECTOR_SIMILARITY_TYPE: "euclidean", // euclidean | cosine | dotProduct
  VECTOR_QUANTIZATION_TYPE: "scalar", // scalar | binary
  VECTOR_INDEX_CONFIGS: [
    { field: CONTENT_VECTOR_FIELD, name: CONTENT_VECTOR_INDEX_NAME },
    { field: SUMMARY_VECTOR_FIELD, name: SUMMARY_VECTOR_INDEX_NAME },
  ],
} as const;
