import { z } from "zod";
import {
  DATABASE_MECHANISM_VALUES,
  OPERATION_TYPE_VALUES,
  QUERY_PATTERN_VALUES,
  TRANSACTION_HANDLING_VALUES,
  DIRECTION_VALUES,
  CODE_SMELL_VALUES,
  FILE_SMELL_VALUES,
  INTEGRATION_MECHANISM_VALUES,
  SOURCE_ENTITY_KIND_VALUES,
  COMPLEXITY_VALUES,
} from "./sources.values";
import {
  normalizeEnumValue,
  normalizeEnumArray,
  DEFAULT_INVALID_VALUE,
} from "../common/schema/schema-utils";

/**
 * Schema for database integration information
 */
export const databaseIntegrationSchema = z
  .object({
    mechanism: z
      .preprocess(
        (val) => normalizeEnumValue(val, DATABASE_MECHANISM_VALUES),
        z.union([z.enum(DATABASE_MECHANISM_VALUES), z.literal(DEFAULT_INVALID_VALUE)]),
      )
      .describe("The database integration mechanism used - only the listed values are valid."),
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
      .preprocess(
        (val) => normalizeEnumArray(val, OPERATION_TYPE_VALUES),
        z.any(),
      )
      .pipe(
        z.array(
          z.union([z.enum(OPERATION_TYPE_VALUES), z.literal(DEFAULT_INVALID_VALUE)]),
        ),
      )
      .optional()
      .describe("Array of database operation types performed - only the listed values are valid."),
    queryPatterns: z
      .string()
      .optional()
      .describe(
        "Free-form description of query patterns (e.g., 'JPQL queries with dynamic criteria'). " +
          "A separate 'queryPatternsNormalized' field may be derived for internal analytics.",
      ),
    queryPatternsNormalized: z
      .preprocess(
        (val) => normalizeEnumValue(val, QUERY_PATTERN_VALUES),
        z.any(),
      )
      .pipe(
        z.union([z.enum(QUERY_PATTERN_VALUES), z.literal(DEFAULT_INVALID_VALUE)]),
      )
      .optional()
      .describe("Normalized query pattern category derived from 'queryPatterns'."),
    transactionHandling: z
      .string()
      .optional()
      .describe(
        "Free-form description of transaction handling (e.g., 'Spring @Transactional annotations" +
          "'). A separate 'transactionHandlingNormalized' field may be derived for internal analytics.",
      ),
    transactionHandlingNormalized: z
      .preprocess(
        (val) => normalizeEnumValue(val, TRANSACTION_HANDLING_VALUES),
        z.any(),
      )
      .pipe(
        z.union([z.enum(TRANSACTION_HANDLING_VALUES), z.literal(DEFAULT_INVALID_VALUE)]),
      )
      .optional()
      .describe("Normalized transaction handling category derived from 'transactionHandling')."),
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
        "A single very small redacted example of some code that performs the database integration" +
          " (if no database integration, just state 'n/a')",
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
    complexity: z
      .preprocess(
        (val) => normalizeEnumValue(val, COMPLEXITY_VALUES),
        z.union([z.enum(COMPLEXITY_VALUES), z.literal(DEFAULT_INVALID_VALUE)]),
      )
      .describe("Complexity score - only the listed values are valid; invalid becomes 'INVALID'."),
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
      .preprocess(
        (val) => normalizeEnumArray(val, CODE_SMELL_VALUES),
        z.any(),
      )
      .pipe(
        z.array(
          z.union([z.enum(CODE_SMELL_VALUES), z.literal(DEFAULT_INVALID_VALUE)]),
        ),
      )
      .optional()
      .describe("List of code smells detected - only the listed values are valid"),
  })
  .passthrough();

/**
 * Schema for integration endpoints (APIs, queues, topics, SOAP services, etc.)
 * Covers REST, SOAP, messaging systems (queues/topics), WebSockets, gRPC, and more.
 */
export const integrationEndpointSchema = z
  .object({
    mechanism: z
      .preprocess(
        (val) => normalizeEnumValue(val, INTEGRATION_MECHANISM_VALUES),
        z.union([z.enum(INTEGRATION_MECHANISM_VALUES), z.literal(DEFAULT_INVALID_VALUE)]),
      )
      .describe(
        "The integration mechanism type - only the listed values are valid; invalid becomes 'INVALID'.",
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
      .preprocess(
        (val) => normalizeEnumValue(val, DIRECTION_VALUES),
        z.any(),
      )
      .pipe(
        z.union([z.enum(DIRECTION_VALUES), z.literal(DEFAULT_INVALID_VALUE)]),
      )
      .optional()
      .describe("Whether this code produces, consumes, both, or is bidirectional"),
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
      .preprocess(
        (val) => normalizeEnumArray(val, FILE_SMELL_VALUES),
        z.any(),
      )
      .pipe(
        z.array(
          z.union([z.enum(FILE_SMELL_VALUES), z.literal(DEFAULT_INVALID_VALUE)]),
        ),
      )
      .optional()
      .describe("File-level code smells - only the listed values are valid"),
  })
  .passthrough();

/**
 * Schema for custom tag library usage
 */
export const customTagSchema = z
  .object({
    prefix: z.string().describe("Tag library prefix (e.g., 'c', 'fmt', 'custom')"),
    uri: z.string().describe("Tag library URI from taglib directive"),
  })
  .passthrough();

/**
 * Schema for JSP metrics
 */
export const jspMetricsSchema = z
  .object({
    scriptletCount: z.number().describe("Number of Java scriptlets (<% ... %>)"),
    expressionCount: z.number().describe("Number of expressions (<%= ... %>)"),
    declarationCount: z.number().describe("Number of declarations (<%! ... %>)"),
    customTags: z
      .array(customTagSchema)
      .optional()
      .describe("List of custom tag libraries imported"),
  })
  .passthrough();

/**
 * Schema for UI framework identification
 */
export const uiFrameworkSchema = z
  .object({
    name: z.string().describe("Framework name (e.g., 'Struts', 'JSF', 'Spring MVC')"),
    version: z.string().optional().describe("Framework version if identifiable"),
    configFile: z.string().describe("Configuration file where framework was detected"),
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
        "A detailed definition of the file's implementation, and what business logic decisions it" +
          " makes (where relevant), in at least 5 sentences.",
      ),
    name: z.string().optional().describe("The name of the main public class or interface."),
    namespace: z
      .string()
      .optional()
      .describe(
        "The fully qualified namespace including class/object name (e.g. classpath in Java).",
      ),
    kind: z
      .preprocess(
        (val) => normalizeEnumValue(val, SOURCE_ENTITY_KIND_VALUES),
        z.union([z.enum(SOURCE_ENTITY_KIND_VALUES), z.literal(DEFAULT_INVALID_VALUE)]),
      )
      .optional()
      .describe("The kind of the main entity - only the listed values are valid."),
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
    jspMetrics: jspMetricsSchema
      .optional()
      .describe("JSP-specific metrics for scriptlets and tag libraries"),
    uiFramework: uiFrameworkSchema
      .optional()
      .describe("UI framework identification from configuration files"),
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
