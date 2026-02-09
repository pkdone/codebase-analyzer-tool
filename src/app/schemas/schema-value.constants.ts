/**
 * Schema value constants - Controlled vocabularies for LLM responses.
 *
 * This module contains enumeration arrays used by:
 * - Zod schemas for validation
 * - Prompt fragments for LLM instructions
 *
 * Extracting these to a separate file decouples the prompt generation layer
 * from the heavy schema definition layer.
 */

// =============================================================================
// DATABASE INTEGRATION VALUES
// =============================================================================

/** Central list of valid DB integration mechanism values (kept uppercase for normalization logic) */
export const DATABASE_MECHANISM_VALUES = [
  "NONE",
  // Java/JVM
  "JDBC",
  "SPRING-DATA",
  "HIBERNATE",
  "JPA",
  "EJB",
  // .NET
  "EF-CORE",
  "ADO-NET",
  "DAPPER",
  // Ruby
  "ACTIVE-RECORD",
  "SEQUEL",
  // Node.js/JavaScript/TypeScript
  "MONGOOSE",
  "PRISMA",
  "TYPEORM",
  "SEQUELIZE",
  "KNEX",
  "DRIZZLE",
  // Python
  "SQLALCHEMY",
  "DJANGO-ORM",
  // Go
  "GORM",
  "SQLX",
  // Mobile
  "ROOM",
  "CORE-DATA",
  // NoSQL Specific
  "MQL",
  "REDIS",
  "ELASTICSEARCH",
  "CASSANDRA-CQL",
  // Generic Categories
  "SQL",
  "ORM",
  "MICRO-ORM",
  "DRIVER",
  // SQL Script Types - for files that ARE database scripts (distinct from operationType
  // which describes what operations application code performs against a database)
  "DDL",
  "DML",
  "STORED-PROCEDURE",
  "PLSQL-PACKAGE",
  "TRIGGER",
  "FUNCTION",
  // Fallback
  "OTHER",
  "INVALID",
] as const;

/** Central list of valid database operation type values */
export const OPERATION_TYPE_VALUES = [
  "READ",
  "WRITE",
  "READ_WRITE",
  "DDL",
  "ADMIN",
  "OTHER",
  "INVALID",
] as const;

/** Central list of common query pattern descriptors (kept intentionally generic) */
export const QUERY_PATTERN_VALUES = [
  "SIMPLE CRUD",
  "COMPLEX JOINS",
  "AGGREGATIONS",
  "STORED PROCEDURES",
  "BATCH OPERATIONS",
  "MIGRATIONS",
  "INLINE SQL",
  "ORM QUERIES",
  "RAW DRIVER CALLS",
  "CACHE LOOKUPS",
  "OTHER",
  "INVALID",
] as const;

/** Central list of common transaction handling approaches */
export const TRANSACTION_HANDLING_VALUES = [
  "SPRING @TRANSACTIONAL",
  "MANUAL",
  "AUTO-COMMIT",
  "NONE",
  "JPA ENTITYTRANSACTION",
  "BATCH",
  "DB CONTEXT",
  "EXPLICIT BEGIN/COMMIT",
  "ROLLBACK ON ERROR",
  "UNKNOWN",
  "OTHER",
  "INVALID",
] as const;

// =============================================================================
// INTEGRATION VALUES
// =============================================================================

/** Integration direction values (messaging) */
export const DIRECTION_VALUES = [
  "PRODUCER",
  "CONSUMER",
  "BOTH",
  "BIDIRECTIONAL",
  "OTHER",
  "INVALID",
] as const;

/** Integration mechanism values (REST, messaging, RPC, etc.) */
export const INTEGRATION_MECHANISM_VALUES = [
  "REST",
  "GRAPHQL",
  "GRPC",
  "SOAP",
  "WEBSOCKET",
  "TRPC",
  "JMS-QUEUE",
  "JMS-TOPIC",
  "KAFKA-TOPIC",
  "RABBITMQ-QUEUE",
  "RABBITMQ-EXCHANGE",
  "ACTIVEMQ-QUEUE",
  "ACTIVEMQ-TOPIC",
  "AWS-SQS",
  "AWS-SNS",
  "AZURE-SERVICE-BUS-QUEUE",
  "AZURE-SERVICE-BUS-TOPIC",
  "REDIS-PUBSUB",
  "WEBHOOK",
  "SSE",
  "OTHER",
  "INVALID",
] as const;

// =============================================================================
// CODE QUALITY VALUES
// =============================================================================

/** Recognized code smell labels for individual methods */
export const CODE_SMELL_VALUES = [
  "LONG METHOD",
  "LONG PARAMETER LIST",
  "COMPLEX CONDITIONAL",
  "DUPLICATE CODE",
  "MAGIC NUMBERS",
  "DEEP NESTING",
  "DEAD CODE",
  "GOD CLASS",
  "LARGE CLASS",
  "DATA CLASS",
  "FEATURE ENVY",
  "SHOTGUN SURGERY",
  "OTHER",
  "INVALID",
] as const;

/** Recognized file-level smell labels */
export const FILE_SMELL_VALUES = [
  "GOD CLASS",
  "TOO MANY METHODS",
  "FEATURE ENVY",
  "DATA CLASS",
  "LARGE FILE",
  "OTHER",
  "INVALID",
] as const;

// =============================================================================
// SOURCE ENTITY VALUES
// =============================================================================

/** Recognized kinds for the main entity represented in a source file summary */
export const SOURCE_ENTITY_KIND_VALUES = [
  "CLASS",
  "INTERFACE",
  "RECORD",
  "STRUCT",
  "ENUM",
  "ANNOTATION-TYPE",
  "MODULE",
  "UNION",
  "FUNCTION",
  "INVALID",
] as const;

/** Complexity score values for procedures/triggers (and similar constructs) */
export const COMPLEXITY_VALUES = ["LOW", "MEDIUM", "HIGH", "INVALID"] as const;

/**
 * Type alias for valid complexity values derived from the COMPLEXITY_VALUES tuple.
 */
export type ComplexityValue = (typeof COMPLEXITY_VALUES)[number];

/**
 * Default complexity level for database objects when complexity cannot be determined.
 * Used as a fallback when the LLM returns invalid or unrecognized complexity values.
 * References the first element of COMPLEXITY_VALUES to ensure schema alignment.
 */
export const DEFAULT_COMPLEXITY: ComplexityValue = COMPLEXITY_VALUES[0];

/**
 * Set version of COMPLEXITY_VALUES for efficient membership checking.
 * Use Set.has() for O(1) lookup instead of Array.includes() O(n).
 * Typed as Set<string> to allow checking any string input.
 */
export const COMPLEXITY_VALUES_SET = new Set<string>(COMPLEXITY_VALUES);

/** Valid object type values for stored procedures/functions in PL/SQL packages */
export const STORED_OBJECT_TYPE_VALUES = ["PROCEDURE", "FUNCTION"] as const;

/**
 * Type alias for valid stored object type values.
 */
export type StoredObjectTypeValue = (typeof STORED_OBJECT_TYPE_VALUES)[number];

/**
 * Default object type when the LLM does not provide one.
 * Falls back to PROCEDURE for backward compatibility with existing data.
 */
export const DEFAULT_STORED_OBJECT_TYPE: StoredObjectTypeValue = STORED_OBJECT_TYPE_VALUES[0];
