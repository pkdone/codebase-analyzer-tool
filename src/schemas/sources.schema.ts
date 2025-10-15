import { z } from "zod";

// Central list of valid database integration mechanism values (kept uppercase for normalization logic)
const DATABASE_MECHANISM_VALUES = [
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
const DATABASE_MECHANISM_SET = new Set<string>(DATABASE_MECHANISM_VALUES);

/**
 * Schema for database integration information
 */
export const databaseIntegrationSchema = z
  .object({
    mechanism: z
      .preprocess(
        (val) => {
          if (typeof val === "string") {
            const upper = val.toUpperCase();
            // If the supplied value isn't one of the valid enumerated values, coerce to OTHER per requirement
            return DATABASE_MECHANISM_SET.has(upper) ? upper : "OTHER";
          }
          return val;
        },
        // Cast through unknown to satisfy z.enum variadic tuple requirement without mutating readonly array
        z.enum(DATABASE_MECHANISM_VALUES as unknown as [string, ...string[]]),
      )
      .describe(
        "The database integration mechanism used - only the listed values are valid; any unrecognized value will be coerced to 'OTHER'.",
      ),
    name: z.string().optional().describe("Name of the database, service, or data access component"),
    description: z
      .string()
      .describe(
        "A detailed description of the way database integration is achieved (or a note saying no database integration related code exists).",
      ),
    databaseName: z
      .string()
      .optional()
      .describe("Name of the database, schema, or collection being accessed"),
    tablesAccessed: z
      .array(z.string())
      .optional()
      .describe("List of tables, collections, or entities being accessed by this code"),
    operationType: z
      .array(z.enum(["READ", "WRITE", "READ_WRITE", "DDL", "ADMIN"]))
      .optional()
      .describe(
        "Array of database operation types performed (e.g., ['READ'], ['WRITE'], ['READ', 'WRITE'], ['DDL'], ['ADMIN'])",
      ),
    queryPatterns: z
      .string()
      .optional()
      .describe(
        "Types of queries used (e.g., 'simple CRUD', 'complex joins', 'aggregations', 'stored procedures')",
      ),
    transactionHandling: z
      .string()
      .optional()
      .describe(
        "How transactions are managed (e.g., 'manual commits', 'Spring @Transactional', 'auto-commit', 'none')",
      ),
    protocol: z
      .string()
      .optional()
      .describe(
        "Database protocol, version, or driver details (e.g., 'PostgreSQL 15', 'MongoDB 6.0')",
      ),
    connectionInfo: z
      .string()
      .optional()
      .describe(
        "Connection string, JDBC URL, or database connection details (redacted if sensitive)",
      ),
    codeExample: z
      .string()
      .describe(
        "A single very small redacted example of some code that performs the database integration (if no database integration, just state 'n/a')",
      ),
  })
  .passthrough();

/**
 * Schema for tables used in DDL files
 */
export const tablesSchema = z
  .object({
    name: z.string().describe("The name of the table."),
    fields: z.string().describe("The names of the fields in the table, comma seperated, if known."),
  })
  .passthrough();

/**
 * Schema for dependency information from build files
 */
export const dependencySchema = z
  .object({
    name: z
      .string()
      .describe("The name of the dependency (artifact ID for Maven, package name for npm/gradle)"),
    groupId: z.string().optional().describe("Group ID for Maven/Gradle dependencies"),
    version: z.string().describe("The version of the dependency"),
    scope: z
      .string()
      .optional()
      .describe("Dependency scope (compile, test, runtime, provided, etc.)"),
    type: z.string().optional().describe("Type of dependency (jar, war, aar, etc.)"),
  })
  .passthrough();

/**
 * Schema for scheduled jobs and batch processes
 */
export const scheduledJobSchema = z
  .object({
    jobName: z.string().describe("The name of the batch job or script"),
    trigger: z
      .string()
      .describe(
        "How/when the job is triggered (e.g., 'cron: 0 2 * * *', 'manual', 'event-driven', 'scheduled')",
      ),
    purpose: z.string().describe("Description of what the job does in detail"),
    inputResources: z
      .array(z.string())
      .optional()
      .describe("Array of input files/databases/APIs used by this job"),
    outputResources: z
      .array(z.string())
      .optional()
      .describe("Array of output files/databases/APIs produced by this job"),
    dependencies: z
      .array(z.string())
      .optional()
      .describe("Array of other jobs/scripts this job depends on"),
    estimatedDuration: z
      .string()
      .optional()
      .describe("Expected runtime duration if determinable (e.g., '2 hours', '30 minutes')"),
  })
  .passthrough();

/**
 * Schema for stored procedures and triggers
 */
export const procedureTriggerSchema = z
  .object({
    name: z.string().describe("The name of the procedure or trigger."),
    purpose: z.string().describe("Detailed purpose in at least 3 sentences."),
    complexity: z.enum(["LOW", "MEDIUM", "HIGH"]).describe("Complexity score."),
    complexityReason: z
      .string()
      .describe("A brief, one-sentence reason for the chosen complexity score."),
    linesOfCode: z.number().describe("Number of lines of code it contains."),
  })
  .passthrough();

/**
 * Schema for public constants
 */
export const publicConstantSchema = z
  .object({
    name: z.string().describe("The name of the constant."),
    value: z.string().describe("The value of the constant."),
    type: z.string().describe("The type of the constant."),
  })
  .passthrough();

/**
 * Schema for a single data input field from a UI form.
 */
export const dataInputFieldSchema = z
  .object({
    name: z
      .string()
      .describe(
        "The name attribute of the input field (of there is no name, suggest and use an approximate indicative name that reflects its purpose).",
      ),
    type: z.string().describe("The type of the input field (e.g., 'text', 'password', 'hidden')."),
    description: z.string().describe("A detailed description of the input field's purpose."),
  })
  .passthrough();

/**
 * Schema for public methods
 */
export const publicMethodSchema = z
  .object({
    name: z.string().describe("The name of the method/function."),
    purpose: z
      .string()
      .describe(
        "Detailed purpose of the method/function and what business logic decisions it makes (where relevant), in at least 5 sentences.",
      ),
    parameters: z
      .array(
        z
          .object({
            name: z.string().describe("The name of the parameter."),
            type: z.string().describe("The type of the parameter."),
          })
          .passthrough(),
      )
      .optional()
      .describe("List parameters of the method/function."),
    returnType: z.string().describe("The return type of the method/function."),
    description: z
      .string()
      .describe("Detailed description of how the method/function is implementated."),
    cyclomaticComplexity: z
      .number()
      .optional()
      .describe(
        "Estimated cyclomatic complexity score (number of independent paths through the code)",
      ),
    linesOfCode: z
      .number()
      .optional()
      .describe("Number of lines of code in this method (excluding comments and blank lines)"),
    codeSmells: z
      .array(z.string())
      .optional()
      .describe(
        "List of code smells detected (e.g., 'Long Method', 'God Class', 'Duplicate Code', 'Long Parameter List')",
      ),
  })
  .passthrough();

// Central list of valid integration mechanism values
const INTEGRATION_MECHANISM_VALUES = [
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
const INTEGRATION_MECHANISM_SET = new Set<string>(INTEGRATION_MECHANISM_VALUES);

/**
 * Schema for integration endpoints (APIs, queues, topics, SOAP services, etc.)
 * Covers REST, SOAP, messaging systems (queues/topics), WebSockets, gRPC, and more.
 */
export const integrationEndpointSchema = z
  .object({
    mechanism: z
      .preprocess(
        (val) => {
          if (typeof val === "string") {
            const upper = val.toUpperCase();
            return INTEGRATION_MECHANISM_SET.has(upper) ? upper : "OTHER";
          }
          return val;
        },
        z.enum(INTEGRATION_MECHANISM_VALUES as unknown as [string, ...string[]]),
      )
      .describe(
        "The integration mechanism type - only the listed values are valid; any unrecognized value will be coerced to 'OTHER'.",
      ),
    name: z.string().describe("Name of the endpoint, queue, topic, or service operation"),
    description: z.string().describe("What this integration point does"),
    path: z
      .string()
      .optional()
      .describe("The endpoint path (e.g., '/api/users/{id}' for REST or operation name for SOAP)"),
    method: z
      .string()
      .optional()
      .describe("HTTP method (GET, POST, PUT, DELETE, PATCH) or SOAP operation"),
    queueOrTopicName: z
      .string()
      .optional()
      .describe("Name of the queue or topic (for JMS, Kafka, RabbitMQ, etc.)"),
    messageType: z
      .string()
      .optional()
      .describe("Type of message being sent/received (for messaging systems)"),
    direction: z
      .enum(["PRODUCER", "CONSUMER", "BOTH", "BIDIRECTIONAL"])
      .optional()
      .describe("Whether this code produces, consumes, or both for messaging systems"),
    requestBody: z
      .string()
      .optional()
      .describe("Expected request body structure or message payload structure"),
    responseBody: z
      .string()
      .optional()
      .describe("Expected response structure or acknowledgment structure"),
    authentication: z
      .string()
      .optional()
      .describe("Authentication mechanism required (JWT, OAuth, SAML, etc.)"),
    protocol: z
      .string()
      .optional()
      .describe("Specific protocol details (e.g., 'HTTP/1.1', 'SOAP 1.2', 'AMQP 0.9.1')"),
    connectionInfo: z
      .string()
      .optional()
      .describe("Connection string, broker info, or WSDL location (redacted if sensitive)"),
  })
  .passthrough();

/**
 * Schema for file-level code quality metrics
 */
export const codeQualityMetricsSchema = z
  .object({
    totalMethods: z.number().describe("Total number of methods in the file"),
    averageComplexity: z.number().optional().describe("Average cyclomatic complexity"),
    maxComplexity: z.number().optional().describe("Maximum cyclomatic complexity found"),
    averageMethodLength: z.number().optional().describe("Average lines of code per method"),
    fileSmells: z
      .array(z.string())
      .optional()
      .describe("File-level code smells (e.g., 'God Class', 'Too Many Methods', 'Feature Envy')"),
  })
  .passthrough();

/**
 * Schema for source file summaries
 */
export const sourceSummarySchema = z
  .object({
    purpose: z
      .string()
      .describe("A detailed definition of the file's purpose in at least 4 sentences."),
    implementation: z
      .string()
      .describe(
        "A detailed definition of the file's implementation, and what business logic decisions it makes (where relevant), in at least 5 sentences.",
      ),
    name: z.string().optional().describe("The name of the main public class or interface."),
    namespace: z
      .string()
      .optional()
      .describe(
        "The fully qualified namespace including class/object name (e.g. classpath in Java).",
      ),
    kind: z
      .enum([
        "class",
        "interface",
        "record",
        "struct",
        "enum",
        "annotation-type",
        "module",
        "union",
      ])
      .optional()
      .describe(
        "The kind of the main entity, e.g., 'class', 'interface', `record`, 'struct`, 'enum', 'annotation-type', 'module', 'union'.",
      ),
    internalReferences: z
      .array(z.string())
      .optional()
      .describe("A list of internal references to other modules in the same project."),
    externalReferences: z
      .array(z.string())
      .optional()
      .describe("A list of external references to 3rd party modules outside this project."),
    storedProcedures: z
      .array(procedureTriggerSchema)
      .optional()
      .describe("A list of stored procedures defined."),
    triggers: z.array(procedureTriggerSchema).optional().describe("A list of triggers defined."),
    tables: z.array(tablesSchema).optional().describe("A list of tables defined."),
    dependencies: z
      .array(dependencySchema)
      .optional()
      .describe("A list of dependencies declared in this build file."),
    scheduledJobs: z
      .array(scheduledJobSchema)
      .optional()
      .describe("A list of scheduled jobs or batch processes defined in this file."),
    publicConstants: z
      .array(publicConstantSchema)
      .optional()
      .describe("A list of public constants defined."),
    publicMethods: z
      .array(publicMethodSchema)
      .optional()
      .describe("A list of public methods/functions)."),
    databaseIntegration: databaseIntegrationSchema
      .optional()
      .describe("Information about how the file interacts with a database."),
    dataInputFields: z
      .array(dataInputFieldSchema)
      .optional()
      .describe("A list of data input fields."),
    integrationPoints: z
      .array(integrationEndpointSchema)
      .optional()
      .describe(
        "List of integration points (REST APIs, SOAP services, message queues/topics, WebSockets, etc.) defined or consumed by this file",
      ),
    codeQualityMetrics: codeQualityMetricsSchema
      .optional()
      .describe("File-level code quality metrics and analysis"),
  })
  .passthrough();

/**
 * Schema for source file metadata
 */
export const sourceSchema = z
  .object({
    projectName: z.string().describe("The name of the project this source file belongs to."),
    filename: z.string().describe("The name of the source file (without path)."),
    filepath: z.string().describe("The full path to the source file within the project."),
    type: z.string().describe("The type of the source file (e.g., 'java', 'js', 'sql', etc.)."),
    linesCount: z.number().describe("The total number of lines in the source file."),
    summary: sourceSummarySchema
      .optional()
      .describe(
        "A detailed summary of the source file, including purpose, implementation, and structure.",
      ),
    summaryError: z.string().optional().describe("Error message if summary generation failed."),
    summaryVector: z
      .array(z.number())
      .optional()
      .describe("Vector embedding representing the summary for semantic search."),
    content: z.string().describe("The full text content of the source file."),
    contentVector: z
      .array(z.number())
      .optional()
      .describe("Vector embedding representing the file content for semantic search."),
  })
  .passthrough();
