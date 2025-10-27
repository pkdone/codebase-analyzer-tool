/**
 * Reusable prompt instruction fragments for building complex prompts.
 * These fragments can be composed to create instruction sets for different file types.
 *
 * IMPORTANT: These fragments do NOT include the "* " prefix - that is added during
 * prompt construction to maintain consistency with the existing system.
 */
export const PROMPT_FRAGMENTS = {
  COMMON: {
    PURPOSE: "A detailed definition of its purpose",
    IMPLEMENTATION: "A detailed definition of its implementation",
    FORCE_JSON_FORMAT: `
In your response, only include JSON and do not include any additional text explanations outside the JSON object.
NEVER ever respond with XML. NEVER use Markdown code blocks to wrap the JSON in your response.
NEVER use " or ' quote symbols as part of the text you use for JSON description values, even if you want to quote a piece of existing text, existing message or show a path
ONLY provide an RFC8259 compliant JSON response that strictly follows the provided JSON schema.
CRITICAL JSON FORMAT REQUIREMENTS:
- ALL property names MUST be enclosed in double quotes (e.g., "name": "value", NOT name: "value")
- ALL string values MUST be enclosed in double quotes
- Use proper JSON syntax with commas separating properties
- Do not include any unquoted property names or values
- Ensure all brackets, braces, and quotes are properly matched
- COMPLETE ALL PROPERTY NAMES: Never truncate or abbreviate property names (e.g., use "references" not "eferences", "implementation" not "implemen")
- ENSURE COMPLETE RESPONSES: Always provide complete, valid JSON that can be parsed without errors
- AVOID TRUNCATION: If you reach token limits, prioritize completing the JSON structure over adding more detail`,
  },

  CODE_QUALITY: {
    INTRO: "Code Quality Analysis (REQUIRED for all code files with methods)",
    METHOD_METRICS: `For each public method/function you identify, you MUST estimate and provide:
- cyclomaticComplexity: Estimate the cyclomatic complexity by counting decision points (if, else, for, while, case, catch, &&, ||, ?:). A simple method with no branches = 1. Add 1 for each decision point.
- linesOfCode: Count actual lines of code (exclude blank lines and comments)
- codeSmells: Identify any of these common code smells present (USE EXACT UPPERCASE ENUMERATION LABELS; if none apply but a smell is clearly present, use OTHER with a short explanation). Allowed labels: LONG METHOD, LONG PARAMETER LIST, COMPLEX CONDITIONAL, DUPLICATE CODE, MAGIC NUMBERS, DEEP NESTING, DEAD CODE, GOD CLASS, LARGE CLASS, DATA CLASS, FEATURE ENVY, SHOTGUN SURGERY, OTHER:`,
    METHOD_SMELLS: `'LONG METHOD' - method has > 50 lines of code
'LONG PARAMETER LIST' - method has > 5 parameters
'COMPLEX CONDITIONAL' - deeply nested if/else or complex boolean expressions
'DUPLICATE CODE' - similar logic repeated in multiple places
'MAGIC NUMBERS' - hardcoded numeric values without explanation
'DEEP NESTING' - more than 3-4 levels of nesting
'DEAD CODE' - unreachable or commented-out code
Optionally (only when clearly evident): 'GOD CLASS', 'LARGE CLASS', 'DATA CLASS', 'FEATURE ENVY', 'SHOTGUN SURGERY'`,
    FILE_METRICS: `Additionally, provide file-level codeQualityMetrics:
- totalMethods: Count of all methods in the file
- averageComplexity: Average of all method complexities
- maxComplexity: Highest complexity score in the file
- averageMethodLength: Average lines of code per method
- fileSmells: File-level smells such as:
  'GOD CLASS' - class has > 20 methods or > 500 lines of code
  'TOO MANY METHODS' - class has > 20 public methods
  'FEATURE ENVY' - methods heavily use data from other classes
  'DATA CLASS' - class only contains fields and getters/setters
  'LARGE FILE' - class file exceeds 500 lines of code
  'OTHER' - some other file-level smell`,
  },

  DB_INTEGRATION: {
    INTRO: "Database Integration Analysis (REQUIRED for files that interact with databases)",
    REQUIRED_FIELDS: `For files that interact with a database, you MUST extract and provide ALL of the following fields in the databaseIntegration object. DO NOT omit any field - if you cannot determine a value, use "unknown" or indicate "not identifiable from code":

REQUIRED FIELDS:
- mechanism (REQUIRED): The integration type - see mechanism mapping below
- description (REQUIRED): Detailed explanation of how database integration is achieved
- codeExample (REQUIRED): A small redacted code snippet showing the database interaction

STRONGLY RECOMMENDED FIELDS (provide whenever possible):
- name: Name of the database service or data access component (e.g., "UserRepository", "OrderDAO", "DatabaseConfig")
- databaseName: Specific database/schema name being accessed (look in connection strings, config files, or annotations)
- tablesAccessed: Array of table/collection/entity names accessed (from SQL queries, JPA entity names, @Table annotations, repository interfaces)
- operationType: Array of operation types (EXACT enumeration values only): READ, WRITE, READ_WRITE, DDL, ADMIN, OTHER. Use READ_WRITE instead of separate READ and WRITE entries.
- queryPatterns: Description of query complexity (e.g., 'simple CRUD', 'complex joins with subqueries', 'aggregations', 'stored procedure calls', 'batch operations')
- transactionHandling: How transactions are managed (e.g., 'Spring @Transactional', 'manual tx.commit()', 'JPA EntityTransaction', 'auto-commit', 'none', 'unknown')
- protocol: Database type and version (e.g., 'PostgreSQL 15', 'MySQL 8.0', 'MongoDB 6.0', 'Oracle 19c', 'H2', 'SQL Server 2019')
- connectionInfo: JDBC URL or connection string - MUST REDACT passwords/secrets (e.g., 'jdbc:postgresql://localhost:5432/mydb', 'mongodb://localhost:27017/appdb')`,
  },

  INTEGRATION_POINTS: {
    INTRO:
      "A list of integration points this file defines or consumes – for each integration include: mechanism type, name, description, and relevant details. Look for:",
  },

  SCHEDULED_JOBS: {
    INTRO:
      "A list of scheduled jobs or batch processes defined in this file – for each job extract:",
    FIELDS: `- jobName: The name of the job (from filename or job card/comments)
- trigger: How/when the job is triggered (cron, scheduled, manual, event-driven)
- purpose: Detailed description of what it does
- inputResources: Array of inputs (files, datasets, DBs, APIs)
- outputResources: Array of outputs (files, datasets, DBs, APIs)
- dependencies: Array of other jobs/scripts/resources it depends on
- estimatedDuration: Expected runtime if mentioned`,
  },

  JAVA_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to the classpaths of other classes and interfaces belonging to the same application referenced by the code of this class/interface (do not include standard Java SE, Java EE 'javax.*' classes or 3rd party library classes in the list of internal references)",
    EXTERNAL_REFS:
      "A list of the external references to third-party classpath used by this source file, which do not belong to this same application that this class/interface file is part of",
    PUBLIC_METHODS:
      "A list of its public methods (if any) - for each public method, include the method's name, its purpose in detail, a list of its parameters, its return type and a very detailed description of its implementation",
    PUBLIC_CONSTANTS: "A list of public constants (name, value and type) it defines (if any)",
  },

  JAVASCRIPT_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to other modules used by this source file (by using `require` or `import` keywords) belonging to the same application referenced by the code in this source file (do not include external or 3rd party modules/libraries in the list of internal references)",
    EXTERNAL_REFS:
      "A list of the external references to other external modules/libraries used by this source file (by using `require` or `import` keywords), which do not belong to this same application that this source file is part of",
  },

  CSHARP_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to other application classes - fully qualified type names (only include 'using' directives that clearly belong to this same application's code – exclude BCL / System.* and third-party packages)",
    EXTERNAL_REFS:
      "A list of the external references to 3rd party / NuGet package classes (Fully qualified type names) it depends on (exclude System.* where possible)",
    PUBLIC_CONSTANTS:
      "A list of public constants / readonly static fields (if any) – include name, value (redact secrets), and a short type/role description",
    PUBLIC_METHODS:
      "A list of its public methods (if any) – for each method list: name, purpose (detailed), parameters (name and type), return type, async/sync indicator, and a very detailed implementation description highlighting notable control flow, LINQ queries, awaits, exception handling, and important business logic decisions",
  },

  PYTHON_SPECIFIC: {
    INTERNAL_REFS:
      "A list of internal references (imports that belong to this same project; exclude Python stdlib & third‑party packages)",
    EXTERNAL_REFS:
      "A list of external references (third‑party libraries imported; exclude stdlib modules like sys, os, json, typing, pathlib, re, math, datetime, logging, asyncio, dataclasses, functools, itertools)",
    PUBLIC_CONSTANTS:
      "A list of public constants (UPPERCASE module-level assignments; include name, redacted value, brief type/role)",
    PUBLIC_METHODS:
      "A list of its public functions/methods – for each include: name, purpose (detailed), parameters (name + type hint or inferred type; if no hint, describe expected type), returnType (type hint or inferred description of returned value shape), implementation (very detailed explanation of logic, branches, important data transformations, exception handling), cyclomaticComplexity (see rules), linesOfCode (exclude blank lines & comments), codeSmells (if any; use EXACT enum labels)",
  },

  RUBY_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to other Ruby source files in the same project that this file depends on (only include paths required via require or require_relative that clearly belong to this same application; exclude Ruby standard library and external gem dependencies)",
    EXTERNAL_REFS:
      "A list of the external references to gem / third-party libraries it depends on (as required via require / require_relative) that are NOT part of this application's own code (exclude Ruby standard library modules)",
    PUBLIC_CONSTANTS:
      "A list of public (non-internal) constants it defines (if any) – for each constant include its name, value (redact secrets), and a short type/role description",
    PUBLIC_METHODS:
      "A list of its public methods (if any) – for each method include: name, purpose (in detail), its parameters (with names), what it returns (describe the value; Ruby is dynamically typed so describe the shape / meaning), and a very detailed description of how it is implemented / key logic / important guards or conditionals",
  },
} as const;

/**
 * Composable instruction sets for common patterns across file types
 */
export const CODE_QUALITY_INSTRUCTIONS = [
  PROMPT_FRAGMENTS.CODE_QUALITY.INTRO,
  PROMPT_FRAGMENTS.CODE_QUALITY.METHOD_METRICS,
  PROMPT_FRAGMENTS.CODE_QUALITY.METHOD_SMELLS,
  PROMPT_FRAGMENTS.CODE_QUALITY.FILE_METRICS,
] as const;

export const DB_INTEGRATION_INSTRUCTIONS = [
  PROMPT_FRAGMENTS.DB_INTEGRATION.INTRO,
  PROMPT_FRAGMENTS.DB_INTEGRATION.REQUIRED_FIELDS,
] as const;

export const INTEGRATION_POINTS_INSTRUCTIONS = [PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO] as const;

export const SCHEDULED_JOBS_INSTRUCTIONS = [
  PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
  PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
] as const;
