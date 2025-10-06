import { z } from "zod";

// Central list of valid database integration mechanism values (kept uppercase for normalization logic)
const DATABASE_MECHANISM_VALUES = [
  "NONE",
  "JDBC",
  "SPRING-DATA",
  "SQL",
  "HIBERNATE",
  "JPA",
  "MQL",
  "ORM",
  "DRIVER",
  "EJB",
  "DDL",
  "DML",
  "STORED-PROCEDURE",
  "TRIGGER",
  "FUNCTION",
  "EF-CORE",
  "ADO-NET",
  "DAPPER",
  "ACTIVE-RECORD",
  "SEQUEL",
  "MONGOOSE",
  "PRISMA",
  "MICRO-ORM",
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
    description: z
      .string()
      .describe(
        "A detailed description of the way database integration is achieved (or a note saying no database integration related code exists).",
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
