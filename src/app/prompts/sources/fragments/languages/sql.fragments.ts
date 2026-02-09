/**
 * SQL-specific instruction fragments.
 */
export const SQL_SPECIFIC_FRAGMENTS = {
  TABLE_LIST:
    "A list of the tables (if any) it defines - for each table, include the names of the table's fields, if known",
  STORED_PROCEDURE_LIST:
    "A list of the stored procedures and functions (if any) it defines - for each one, include: the name, the objectType (must be exactly 'PROCEDURE' if it does not return a value, or 'FUNCTION' if it returns a value), its purpose, the number of lines of code, and a complexity score (must be one of: 'LOW', 'MEDIUM', 'HIGH') along with a short reason for the chosen complexity score",
  TRIGGER_LIST:
    "A list of the triggers (if any) it defines - for each trigger, include: the name, its purpose, the number of lines of code in the trigger, and a complexity score (must be one of: 'LOW', 'MEDIUM', 'HIGH') along with a short reason for the chosen complexity score",
  DB_INTEGRATION_ANALYSIS: `Database Integration Analysis (REQUIRED) - Extract ALL possible database details:
IMPORTANT: databaseIntegration must be a SINGLE OBJECT (not an array). If multiple integration mechanisms exist in the file (e.g., both STORED-PROCEDURE and DDL), combine them into one object:
  - mechanism: Use the primary mechanism (or combine related mechanisms in the description)
  - description: Include details about ALL integration mechanisms present
  - codeExample: Include examples from all relevant mechanisms
  - tablesAccessed: Merge all tables accessed across all mechanisms
  - operationType: Merge all operation types across mechanisms
REQUIRED: mechanism (must be 'NONE', 'DDL', 'DML', 'SQL', 'STORED-PROCEDURE', or 'TRIGGER'), description (detailed explanation covering all mechanisms if multiple exist), codeExample (max 6 lines, can include examples from multiple mechanisms)
STRONGLY RECOMMENDED (extract whenever possible): databaseName (specific database/schema name if mentioned), tablesAccessed (array of table names from queries or DDL), operationType (array: ['READ'], ['WRITE'], ['READ', 'WRITE'], ['DDL'], ['ADMIN']), queryPatterns (e.g., 'CREATE TABLE statements', 'INSERT/UPDATE operations', 'complex joins', 'stored procedures'), transactionHandling (e.g., 'explicit BEGIN/COMMIT', 'auto-commit', 'none'), protocol (database type and version if identifiable, e.g., 'PostgreSQL 14', 'MySQL 8.0', 'SQL Server 2019', 'Oracle 19c'), connectionInfo ('not applicable for SQL files' or specific connection details if present)`,
} as const;
