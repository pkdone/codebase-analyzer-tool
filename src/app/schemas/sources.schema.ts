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
} from "./sources.enums";
import {
  createCaseInsensitiveEnumSchema,
  normalizeEnumArray,
  DEFAULT_INVALID_VALUE,
} from "../../common/schema/schema-utils";

/**
 * Schema for database integration information
 */
export const databaseIntegrationSchema = z
  .object({
    mechanism: createCaseInsensitiveEnumSchema(DATABASE_MECHANISM_VALUES).describe(
      "The database integration mechanism used - only the listed values are valid.",
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
      .preprocess((val) => normalizeEnumArray(val, OPERATION_TYPE_VALUES), z.any())
      .pipe(z.array(z.union([z.enum(OPERATION_TYPE_VALUES), z.literal(DEFAULT_INVALID_VALUE)])))
      .optional()
      .describe("Array of database operation types performed - only the listed values are valid."),
    queryPatterns: z
      .string()
      .optional()
      .describe(
        "Free-form description of query patterns (e.g., 'JPQL queries with dynamic criteria'). " +
          "A separate 'queryPatternsNormalized' field may be derived for internal analytics.",
      ),
    queryPatternsNormalized: createCaseInsensitiveEnumSchema(QUERY_PATTERN_VALUES)
      .optional()
      .describe("Normalized query pattern category derived from 'queryPatterns'."),
    transactionHandling: z
      .string()
      .optional()
      .describe(
        "Free-form description of transaction handling (e.g., 'Spring @Transactional annotations" +
          "'). A separate 'transactionHandlingNormalized' field may be derived for internal analytics.",
      ),
    transactionHandlingNormalized: createCaseInsensitiveEnumSchema(TRANSACTION_HANDLING_VALUES)
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
    version: z
      .string()
      .nullable()
      .optional()
      .describe("The version of the dependency (if available)"),
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
    complexity: createCaseInsensitiveEnumSchema(COMPLEXITY_VALUES).describe(
      "Complexity score - only the listed values are valid; invalid becomes 'INVALID'.",
    ),
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
    name: z.string().default("").describe("The name of the constant."),
    value: z.string().default("").describe("The value of the constant."),
    type: z.string().default("").describe("The type of the constant."),
  })
  .passthrough();

/**
 * Schema for a single data input field from a UI form.
 */
export const dataInputFieldSchema = z
  .object({
    name: z
      .string()
      .default("")
      .describe(
        "The name attribute of the input field (of there is no name, suggest and use an approximate indicative name that reflects its purpose).",
      ),
    type: z
      .string()
      .default("")
      .describe("The type of the input field (e.g., 'text', 'password', 'hidden')."),
    description: z
      .string()
      .default("")
      .describe("A detailed description of the input field's purpose."),
  })
  .passthrough();

/**
 * Schema for public functions/methods
 */
export const publicFunctionSchema = z
  .object({
    name: z.string().default("").describe("The name of the function/method."),
    purpose: z
      .string()
      .default("")
      .describe(
        "Detailed purpose of the function/method and what business logic decisions it makes (where relevant), in at least 5 sentences.",
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
      .describe("List parameters of the function/method."),
    returnType: z.string().default("").describe("The return type of the function/method."),
    description: z
      .string()
      .default("")
      .describe("Detailed description of how the function/method is implemented."),
    cyclomaticComplexity: z
      .number()
      .optional()
      .describe(
        "Estimated cyclomatic complexity score (number of independent paths through the code)",
      ),
    linesOfCode: z
      .number()
      .optional()
      .describe(
        "Number of lines of code in this function/method (excluding comments and blank lines)",
      ),
    codeSmells: z
      .preprocess((val) => normalizeEnumArray(val, CODE_SMELL_VALUES), z.any())
      .pipe(z.array(z.union([z.enum(CODE_SMELL_VALUES), z.literal(DEFAULT_INVALID_VALUE)])))
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
    mechanism: createCaseInsensitiveEnumSchema(INTEGRATION_MECHANISM_VALUES).describe(
      "The integration mechanism type - only the listed values are valid; invalid becomes 'INVALID'.",
    ),
    name: z
      .string()
      .default("")
      .describe("Name of the endpoint, queue, topic, or service operation"),
    description: z.string().default("").describe("What this integration point does"),
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
    direction: createCaseInsensitiveEnumSchema(DIRECTION_VALUES)
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
    totalFunctions: z.number().describe("Total number of functions/methods in the file"),
    averageComplexity: z.number().optional().describe("Average cyclomatic complexity"),
    maxComplexity: z.number().optional().describe("Maximum cyclomatic complexity found"),
    averageFunctionLength: z
      .number()
      .optional()
      .describe("Average lines of code per function/method"),
    fileSmells: z
      .preprocess((val) => normalizeEnumArray(val, FILE_SMELL_VALUES), z.any())
      .pipe(z.array(z.union([z.enum(FILE_SMELL_VALUES), z.literal(DEFAULT_INVALID_VALUE)])))
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
    kind: createCaseInsensitiveEnumSchema(SOURCE_ENTITY_KIND_VALUES)
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
      .describe("A list of dependencies declared in this project configuration file."),
    scheduledJobs: z
      .array(scheduledJobSchema)
      .optional()
      .describe("A list of scheduled jobs or batch processes defined in this file."),
    publicConstants: z
      .array(publicConstantSchema)
      .optional()
      .describe("A list of public constants defined."),
    publicFunctions: z
      .array(publicFunctionSchema)
      .optional()
      .describe("A list of public functions/methods."),
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
      .describe("UI framework identification from configuration and UI files"),
  })
  .passthrough();

/**
 * Schema for source file metadata
 * Note: We define the canonical file type enum here to avoid circular dependency issues
 * with file-types.config.ts. The values must match CANONICAL_FILE_TYPES in that file.
 */
const CANONICAL_FILE_TYPES = [
  "java",
  "javascript",
  "sql",
  "xml",
  "jsp",
  "markdown",
  "csharp",
  "ruby",
  "maven",
  "gradle",
  "ant",
  "npm",
  "python",
  "dotnet-proj",
  "nuget",
  "ruby-bundler",
  "python-pip",
  "python-setup",
  "python-poetry",
  "shell-script",
  "batch-script",
  "jcl",
  "default",
] as const;

const canonicalFileTypeSchema = z.enum(CANONICAL_FILE_TYPES);

export const sourceSchema = z
  .object({
    projectName: z.string().describe("The name of the project this source file belongs to."),
    filename: z.string().describe("The name of the source file (without path)."),
    filepath: z.string().describe("The full path to the source file within the project."),
    fileType: z.string().describe("The type of the source file (e.g., 'java', 'js', 'sql', etc.)."),
    canonicalType: canonicalFileTypeSchema
      .optional()
      .describe("The canonical file type category (e.g., 'javascript' for .ts/.js files)."),
    linesCount: z.number().describe("The total number of lines in the source file."),
    summary: sourceSummarySchema
      .partial()
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
