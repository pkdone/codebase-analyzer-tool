import type { IndexSpecification } from "mongodb";
import { SOURCE_FIELDS } from "../../schemas/sources.constants";

/**
 * Database configuration
 */
const CONTENT_VECTOR_FIELD = "contentVector";
const SUMMARY_VECTOR_FIELD = "summaryVector";
const CONTENT_VECTOR_INDEX_NAME = "contentVector_vector_index";
const SUMMARY_VECTOR_INDEX_NAME = "summaryVector_vector_index";

/**
 * Collection type identifiers for index configurations.
 * Use these constants instead of hardcoded strings.
 */
export const COLLECTION_TYPES = {
  SOURCES: "sources",
  SUMMARIES: "summaries",
} as const;

/**
 * Collection type identifier for index configurations.
 * Used to determine which collection an index should be created on.
 */
export type CollectionType = (typeof COLLECTION_TYPES)[keyof typeof COLLECTION_TYPES];

/**
 * Configuration for a standard MongoDB index.
 */
interface StandardIndexConfig {
  /** Which collection this index belongs to */
  collection: CollectionType;
  /** The index specification (field(s) and direction) */
  spec: IndexSpecification;
}

/**
 * Standard index configurations for the database.
 * These indexes are created during database initialization.
 * Using SOURCE_FIELDS constants ensures consistency with the schema.
 */
export const STANDARD_INDEX_CONFIGS: readonly StandardIndexConfig[] = [
  {
    collection: COLLECTION_TYPES.SOURCES,
    spec: { [SOURCE_FIELDS.PROJECT_NAME]: 1, [SOURCE_FIELDS.FILEPATH]: 1 },
  },
  {
    collection: COLLECTION_TYPES.SOURCES,
    spec: { [SOURCE_FIELDS.PROJECT_NAME]: 1, [SOURCE_FIELDS.TYPE]: 1 },
  },
  {
    collection: COLLECTION_TYPES.SOURCES,
    spec: { [SOURCE_FIELDS.PROJECT_NAME]: 1, [SOURCE_FIELDS.CANONICAL_TYPE]: 1 },
  },
  {
    collection: COLLECTION_TYPES.SOURCES,
    spec: { [SOURCE_FIELDS.PROJECT_NAME]: 1, [SOURCE_FIELDS.SUMMARY_NAMESPACE]: 1 },
  },
  {
    collection: COLLECTION_TYPES.SOURCES,
    spec: { [SOURCE_FIELDS.PROJECT_NAME]: 1, [SOURCE_FIELDS.SUMMARY_PUBLIC_FUNCTIONS]: 1 },
  },
  {
    collection: COLLECTION_TYPES.SOURCES,
    spec: { [SOURCE_FIELDS.PROJECT_NAME]: 1, [SOURCE_FIELDS.SUMMARY_INTEGRATION_POINTS]: 1 },
  },
  {
    collection: COLLECTION_TYPES.SOURCES,
    spec: {
      [SOURCE_FIELDS.PROJECT_NAME]: 1,
      [SOURCE_FIELDS.SUMMARY_CODE_QUALITY_FILE_SMELLS]: 1,
    },
  },
  {
    collection: COLLECTION_TYPES.SOURCES,
    spec: {
      [SOURCE_FIELDS.PROJECT_NAME]: 1,
      [SOURCE_FIELDS.SUMMARY_DB_INTEGRATION]: 1,
      [SOURCE_FIELDS.SUMMARY_DB_INTEGRATION_MECHANISM]: 1,
    },
  },
  {
    collection: COLLECTION_TYPES.SUMMARIES,
    spec: { [SOURCE_FIELDS.PROJECT_NAME]: 1 },
  },
] as const;

/**
 * Database configuration interface for type validation.
 * Ensures the configuration conforms to the expected structure at compile time.
 */
interface DatabaseConfig {
  readonly DEFAULT_MONGO_SERVICE_ID: string;
  readonly CODEBASE_DB_NAME: string;
  readonly SOURCES_COLLECTION_NAME: string;
  readonly SUMMARIES_COLLECTION_NAME: string;
  readonly CONTENT_VECTOR_FIELD: string;
  readonly SUMMARY_VECTOR_FIELD: string;
  readonly CONTENT_VECTOR_INDEX_NAME: string;
  readonly SUMMARY_VECTOR_INDEX_NAME: string;
  readonly DEFAULT_VECTOR_DIMENSIONS: number;
  readonly VECTOR_SIMILARITY_TYPE: string;
  readonly VECTOR_QUANTIZATION_TYPE: string;
  readonly VECTOR_INDEX_CONFIGS: readonly { readonly field: string; readonly name: string }[];
}

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
} as const satisfies DatabaseConfig;
