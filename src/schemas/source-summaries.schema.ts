import { z } from "zod";

/**
 * Schema for database integration information
 * Used across multiple file summary types and database storage
 */
export const databaseIntegrationSchema = z
  .object({
    mechanism: z
      .enum([
        "NONE",
        "JDBC",
        "SPRING-DATA",
        "SQL",
        "HIBERNATE",
        "JPA",
        "MQL",
        "ORM",
        "EJB",
        "DDL",
        "DML",
        "STORED-PROCEDURE",
        "TRIGGER",
        "FUNCTION",
        "OTHER",
      ])
      .describe(
        "The database integration mechanism used - it can only be one of the values specified - choose 'OTHER' if no values match.",
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
    command: z.string().describe("The DDL command for the table."),
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
 * Canonical schema for source file summaries
 * This is the single source of truth for what a file summary can contain
 * All other summary schemas should be derived from this one
 */
export const sourceFileSummarySchema = z
  .object({
    purpose: z
      .string()
      .describe("A detailed definition of the file's purpose in at least 4 sentences."),
    implementation: z
      .string()
      .describe(
        "A detailed definition of the file's implementation, and what business logic decisions it makes (where relevant), in at least 5 sentences.",
      ),
    classname: z.string().optional().describe("The name of the main public class or interface."),
    classpath: z.string().optional().describe("The fully qualified classpath."),
    classType: z
      .enum(["class", "interface"])
      .optional()
      .describe("The type of the main entity, e.g., 'class' or 'interface'."),
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
    externalSystemActivities: z
      .array(z.string())
      .optional()
      .describe("A list of external system activities."),
    deployableModules: z.array(z.string()).optional().describe("A list of deployable modules."),
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
 * Union type for all possible summary types
 * This represents the canonical type for source summaries
 */
export type SourceSummaryType = z.infer<typeof sourceFileSummarySchema>;
