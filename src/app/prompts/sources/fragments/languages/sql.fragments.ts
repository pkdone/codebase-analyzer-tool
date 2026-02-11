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
IMPORTANT: databaseIntegration must be a SINGLE OBJECT (not an array). If multiple integration mechanisms exist in the file, combine them into one object:
  - mechanism: Use the primary mechanism (see guide below)
  - description: Include details about ALL integration mechanisms present
  - codeExample: Include examples from all relevant mechanisms
  - tablesAccessed: Merge all tables accessed across all mechanisms
  - operationType: Merge all operation types across all mechanisms
MECHANISM SELECTION GUIDE (choose the FIRST match):
  - 'PLSQL-PACKAGE': PL/SQL package bodies (.pkb) or package specifications (.pks) — use this for ANY Oracle PL/SQL package regardless of whether it contains procedures, functions, or SQL queries
  - 'STORED-PROCEDURE': Standalone stored procedure definitions (not part of a PL/SQL package)
  - 'TRIGGER': Trigger definitions (.trg or standalone trigger scripts)
  - 'FUNCTION': Standalone function definitions (not part of a PL/SQL package)
  - 'DDL': Files that primarily define schema objects (CREATE TABLE, ALTER, etc.)
  - 'DML': Files that primarily contain data manipulation scripts (INSERT, UPDATE, DELETE)
  - 'SQL': Generic SQL query files that don't fit the above categories
  - 'NONE': No database interaction
REQUIRED: mechanism (use the guide above), description (detailed explanation covering all mechanisms if multiple exist), codeExample (max 6 lines, can include examples from multiple mechanisms)
STRONGLY RECOMMENDED (extract whenever possible): databaseName (specific database/schema name if mentioned), tablesAccessed (array of ALL table names referenced in queries, DML, joins, or DDL), operationType (array: ['READ'], ['WRITE'], ['READ_WRITE'], ['DDL'], ['ADMIN']), queryPatterns (e.g., 'CREATE TABLE statements', 'INSERT/UPDATE operations', 'complex joins with subqueries', 'MERGE operations', 'pipelined functions'), transactionHandling (e.g., 'explicit COMMIT', 'auto-commit', 'none'), protocol (database type and version if identifiable, e.g., 'Oracle 19c', 'PostgreSQL 14', 'MySQL 8.0', 'SQL Server 2019'), connectionInfo ('not applicable for SQL files' or specific connection details if present)`,
} as const;
