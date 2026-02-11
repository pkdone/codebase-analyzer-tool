/**
 * Database integration analysis instruction fragments.
 *
 * These fragments provide structured instructions for LLMs to analyze
 * database integration patterns including mechanism types, required fields,
 * and connection details in source code files.
 */

/**
 * Database integration analysis instruction fragments.
 * Contains structured prompts for identifying database operations, connections,
 * and data access patterns in source code.
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
