/**
 * Common instruction fragments used across multiple sources templates.
 *
 * The COMMON section provides generic, language-agnostic instructions that work across
 * all programming languages. Modern LLMs can infer language-specific details from the
 * code context, making these generic instructions effective for most use cases.
 */

import { INTEGRATION_MECHANISM_VALUES } from "../../../../schemas/schema-value.constants";

/**
 * Type for integration mechanism values that have mechanism descriptions.
 * These are the values that appear in prompt instructions.
 */
type DescribedMechanism = Extract<
  (typeof INTEGRATION_MECHANISM_VALUES)[number],
  "REST" | "GRAPHQL" | "SOAP" | "WEBSOCKET" | "GRPC" | "SSE" | "TRPC"
>;

/**
 * Creates a mechanism description string from an enum value.
 * This ensures type safety between the schema and prompt instructions.
 *
 * @param mechanism - The integration mechanism value from the schema
 * @returns A formatted mechanism description string for use in prompts
 */
function createMechanismDesc(mechanism: DescribedMechanism): string {
  return `(mechanism: '${mechanism}')`;
}

export const COMMON_FRAGMENTS = {
  PURPOSE: "A detailed definition of its purpose",
  IMPLEMENTATION: "A detailed definition of its implementation",
  DB_IN_DOCUMENTATION:
    "Look for database schemas, queries, or data models mentioned in the documentation",
  DB_IN_FILE: "Look for database operations, queries, or connections in the file",
} as const;

/**
 * Code quality analysis instruction fragments.
 */
export const CODE_QUALITY_FRAGMENTS = {
  INTRO: "Code Quality Analysis (REQUIRED for all code files and for all public functions/methods)",
  FUNCTION_METRICS: `For each public function/method you identify, you MUST estimate and provide:
  * cyclomaticComplexity: Estimate the cyclomatic complexity by counting decision points (if, else, for, while, case, catch, &&, ||, ?:). A simple function with no branches = 1. Add 1 for each decision point.
  * linesOfCode: Count actual lines of code (exclude blank lines and comments)
  * codeSmells: Identify any of these common code smells present. Allowed labels:`,
  FUNCTION_SMELLS: `    - 'LONG METHOD' - function/method has > 50 lines of code
    - 'LONG PARAMETER LIST' - function/method has > 5 parameters
    - 'COMPLEX CONDITIONAL' - deeply nested if/else or complex boolean expressions
    - 'DUPLICATE CODE' - similar logic repeated in multiple places
    - 'MAGIC NUMBERS' - hardcoded numeric values without explanation
    - 'DEEP NESTING' - more than 3-4 levels of nesting
    - 'DEAD CODE' - unreachable or commented-out code
    - 'OTHER' - some other function/method-level smell`,
  FILE_METRICS: `For file-level codeQualityMetrics, provide:
  * totalFunctions: Count of all functions/methods in the file
  * averageComplexity: Average of all function/method complexities
  * maxComplexity: Highest complexity score in the file
  * averageFunctionLength: Average lines of code per function/method
  * fileSmells: File-level smells. Allowed labels:
    - 'GOD CLASS' - class has > 20 functions/methods or > 500 lines of code
    - 'TOO MANY METHODS' - class has > 20 public functions/methods
    - 'FEATURE ENVY' - functions/methods heavily use data from other classes
    - 'DATA CLASS' - class only contains fields and getters/setters
    - 'LARGE FILE' - class file exceeds 500 lines of code
    - 'OTHER' - some other file-level smell`,
} as const;

/**
 * Database integration analysis instruction fragments.
 */
export const DB_INTEGRATION_FRAGMENTS = {
  INTRO: "Database Integration Analysis (REQUIRED for source files that interact with databases)",
  REQUIRED_FIELDS: `For files that interact with a database, you MUST extract and provide ALL of the following fields in the databaseIntegration object. DO NOT omit any field - if you cannot determine a value, use "unknown" or indicate "not identifiable from code":
  * REQUIRED FIELDS:
    - mechanism (REQUIRED): The integration type - see mechanism mapping below (use "NONE" if no database integration)
    - description (REQUIRED): Detailed explanation of how database integration is achieved (use "n/a" if no database integration)
    - codeExample (REQUIRED): A small redacted code snippet showing the database interaction  (use "n/a" if no database integration)
  * STRONGLY RECOMMENDED FIELDS (provide whenever possible, using "n/a" if no database integration):
    - name: Name of the database service or data access component (e.g., "UserRepository", "OrderDAO", "DatabaseConfig")
    - databaseName: Specific database/schema name being accessed (look in connection strings, config files, or annotations)
    - tablesAccessed: Array of table/collection/entity names accessed (from SQL queries, JPA entity names, @Table annotations, repository interfaces)
    - operationType: Array of operation types (EXACT enumeration values only): READ, WRITE, READ_WRITE, DDL, ADMIN, OTHER. Use READ_WRITE instead of separate READ and WRITE entries.
    - queryPatterns: Description of query complexity (e.g., 'simple CRUD', 'complex joins with subqueries', 'aggregations', 'stored procedure calls', 'batch operations')
    - transactionHandling: How transactions are managed (e.g., 'Spring @Transactional', 'manual tx.commit()', 'JPA EntityTransaction', 'auto-commit', 'none', 'unknown')
    - protocol: Database type and version (e.g., 'PostgreSQL 15', 'MySQL 8.0', 'MongoDB 6.0', 'Oracle 19c', 'H2', 'SQL Server 2019')
    - connectionInfo: JDBC URL or connection string - MUST REDACT passwords/secrets (e.g., 'jdbc:postgresql://localhost:5432/mydb', 'mongodb://localhost:27017/appdb')`,
} as const;

/**
 * Integration points instruction fragments.
 */
export const INTEGRATION_POINTS_FRAGMENTS = {
  INTRO:
    "A list of integration points this file defines or consumes – for each integration include: mechanism type, name, description, and relevant details. Look for:",
} as const;

/**
 * Scheduled jobs instruction fragments.
 */
export const SCHEDULED_JOBS_FRAGMENTS = {
  INTRO: "A list of scheduled jobs or batch processes defined in this file – for each job extract:",
  FIELDS: ` * jobName: The name of the job (from filename or job card/comments)
  * trigger: How/when the job is triggered (cron, scheduled, manual, event-driven)
  * purpose: Detailed description of what it does
  * inputResources: Array of inputs (files, datasets, DBs, APIs)
  * outputResources: Array of outputs (files, datasets, DBs, APIs)
  * dependencies: Array of other jobs/scripts/resources it depends on
  * - estimatedDuration: Expected runtime if mentioned`,
} as const;

/**
 * Base instruction fragments for entity identification.
 */
export const BASE_FRAGMENTS = {
  CLASS: [
    "The name of the main public class/interface of the file",
    "Its kind ('class' or 'interface')",
    "Its namespace (classpath)",
  ] as const,
  MODULE: [
    "The name of the primary public entity of the file (class, module, or main function)",
    "Its kind ('class', 'module', or enum; choose the dominant one)",
    "Its namespace (fully qualified module path)",
  ] as const,
} as const;

/**
 * Standard mechanism descriptions for integration points.
 * These are used across multiple language-specific fragments to ensure consistency.
 *
 * The descriptions are derived from INTEGRATION_MECHANISM_VALUES to ensure type safety.
 * If the enum values change in the schema, TypeScript will catch any mismatches.
 */
export const MECHANISM_DESCRIPTIONS = {
  REST: createMechanismDesc("REST"),
  GRAPHQL: createMechanismDesc("GRAPHQL"),
  SOAP: createMechanismDesc("SOAP"),
  WEBSOCKET: createMechanismDesc("WEBSOCKET"),
  GRPC: createMechanismDesc("GRPC"),
  SSE: createMechanismDesc("SSE"),
  TRPC: createMechanismDesc("TRPC"),
} as const;
