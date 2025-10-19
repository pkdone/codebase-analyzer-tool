// Shared constant value enumerations for sources.schema.

// Central list of valid DB integration mechanism values (kept uppercase for normalization logic)
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
  // Database Operations (consider if these should remain - could use operationType instead)
  "DDL",
  "DML",
  "STORED-PROCEDURE",
  "TRIGGER",
  "FUNCTION",
  // Fallback
  "OTHER",
] as const;

// Central list of valid database operation type values
export const OPERATION_TYPE_VALUES = [
  "READ",
  "WRITE",
  "READ_WRITE",
  "DDL",
  "ADMIN",
  "OTHER",
] as const;

// Central list of common query pattern descriptors (kept intentionally generic)
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
] as const;

// Central list of common transaction handling approaches
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
] as const;

// Integration direction values (messaging)
export const DIRECTION_VALUES = ["PRODUCER", "CONSUMER", "BOTH", "BIDIRECTIONAL", "OTHER"] as const;

// Recognized code smell labels for individual methods
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
] as const;

// Recognized file-level smell labels
export const FILE_SMELL_VALUES = [
  "GOD CLASS",
  "TOO MANY METHODS",
  "FEATURE ENVY",
  "DATA CLASS",
  "LARGE FILE",
  "OTHER",
] as const;

// Integration mechanism values (REST, messaging, RPC, etc.)
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
] as const;

// Recognized kinds for the main entity represented in a source file summary
export const SOURCE_ENTITY_KIND_VALUES = [
  "CLASS",
  "INTERFACE",
  "RECORD",
  "STRUCT",
  "ENUM",
  "ANNOTATION-TYPE",
  "MODULE",
  "UNION",
] as const;

// Complexity score values for procedures/triggers (and similar constructs)
export const COMPLEXITY_VALUES = ["LOW", "MEDIUM", "HIGH"] as const;
