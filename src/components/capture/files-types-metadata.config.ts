import {
  sourceFileSummarySchema,
  databaseIntegrationSchema,
} from "../../schemas/source-summaries.schema";
import { z } from "zod";
import { DynamicPromptReplaceVars } from "../../llm/processing/prompting/prompt-templator";

/**
 * Common instruction phrases used across multiple file type templates
 */
const COMMON_INSTRUCTIONS = {
  PURPOSE: "A detailed definition of its purpose",
  IMPLEMENTATION: "A detailed definition of its implementation",
  DB_INTEGRATION:
    "The type of direct database integration via a driver/library/API it employs, if any (stating the mechanism used in capitals, or NONE if no code does not interact with a database directly), a description of the database integration and an example code snippet that performs the database integration",
  INTERNAL_REFS_JAVA:
    "A list of the internal references to classpaths of other classes and interfaces belonging to the same application referenced by the code of this class/interface (do not include standard Java SE, Java EE 'javax.*' classes or 3rd party library classes in the list of internal references)",
  INTERNAL_REFS_JS:
    "A list of the internal references to other modules used by this source file (by using `require` or `import` keywords) belonging to the same application referenced by the code in this source file (do not include external or 3rd party modules/libraries in the list of internal references)",
  EXTERNAL_REFS_JAVA:
    "A list of the external references to third-party classes used by this source file, which do not belong to this same application that this class/interface file is part of",
  EXTERNAL_REFS_JS:
    "A list of the external references to other external modules/libraries used by this source file (by using `require` or `import` keywords), which do not belong to this same application that this source file is part of",
} as const;

/**
 * Data-driven mapping of prompt types to their templates and schemas
 */
export const filesTypeMetatadataConfig: Record<string, DynamicPromptReplaceVars> = {
  java: {
    fileContentDesc: "Java code",
    instructions: `* The name of the main public class/interface of the file
 * Its class type ('class' or 'interface')
 * Its classpath
 * ${COMMON_INSTRUCTIONS.PURPOSE}
 * ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
 * ${COMMON_INSTRUCTIONS.INTERNAL_REFS_JAVA}
 * ${COMMON_INSTRUCTIONS.EXTERNAL_REFS_JAVA}
 * A list of public constants (name, value and type) it defines (if any)
 * A list of its public methods (if any) - for each public method, include the method's name, its purpose in detail, a list of its parameters, its return type and a very detailed description of its implementation
 * The type of database integration it employs (if any), stating the mechanism used, a description of the integration and an example code snippet that performs the database integration - if any of the following elements are true in the code, you MUST assume that there is database interaction (if you know the table names the code interacts with, include these table names in the description):
    - Code uses a JDBC driver or JDBC API (set mechanism: 'JDBC')
    - Code contains SQL code (set mechanism: 'SQL')
    - Code uses a database driver or library (set mechanism: 'DRIVER')
    - Code uses a database Object-Relational-Mapper (ORM) like JPA, TopLink, Hibernate, etc, (set mechanism: 'ORM')
    - Code uses a Spring Data API (set mechanism: 'SPRING-DATA')
    - Code has a Java class integrating with a database by an Enterprise Java Bean (EJB), which also could be CMP or BMP based (set mechanism: 'EJB')
    - Code uses a 3rd party framework/library for database access (set mechanism: 'OTHER')
    - Otherwise, if the code does not use a database, then set mechanism: 'NONE'
    (note, JMS and JNDI are not related to interacting with a dataase)`,
    schema: sourceFileSummarySchema
      .pick({
        classname: true,
        classType: true,
        classpath: true,
        purpose: true,
        implementation: true,
        internalReferences: true,
        externalReferences: true,
        publicConstants: true,
        publicMethods: true,
        databaseIntegration: true,
      })
      .extend({
        // Add descriptions for LLM prompts
        internalReferences: z
          .array(z.string())
          .describe("A list of internal classpaths referenced."),
        externalReferences: z
          .array(z.string())
          .describe("A list of third-party classpaths referenced."),
      }),
    trickySchema: false,
  },
  javascript: {
    fileContentDesc: "JavaScript/TypeScript code",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
 * ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
 * ${COMMON_INSTRUCTIONS.INTERNAL_REFS_JS}
 * ${COMMON_INSTRUCTIONS.EXTERNAL_REFS_JS}
 * ${COMMON_INSTRUCTIONS.DB_INTEGRATION}.`,
    schema: sourceFileSummarySchema.pick({
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      databaseIntegration: true,
    }),
    trickySchema: false,
  },
  default: {
    fileContentDesc: "project file content",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}.`,
    schema: sourceFileSummarySchema.pick({
      purpose: true,
      implementation: true,
    }),
    trickySchema: false,
  },
  sql: {
    fileContentDesc: "database DDL/DML/SQL code",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
 * ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
 * A list of the tables (if any) it defines - for each table, include the table's name and a copy of the command that creates the file used to create the table
 * A list of the stored procedure (if any) it defines - for each stored procedure, include the stored procedure's name, its purpose in detail, the number of lines of code in the stored procedure, and a complexity score or how complex the stored procedure's code is (the score must be have one of the following values: 'LOW', 'MEDIUM', 'HIGH') along with a reason for the chosen complexity score.
 * A list of the triggers (if any) it defines - for each trigger, include the trigger's name, its purpose in detail, the number of lines of code in the trigger, and a complexity score or how complex the trigger's code is (the score must be have one of the following values: 'LOW', 'MEDIUM', 'HIGH') along with a reason for the chosen complexity score.
 * The most prominent type of database integration it employs (if any), stating the mechanism used ('NONE', 'DDL', 'DML', 'SQL', 'STORED-PROCEDURE', or 'TRIGGER'), a description of the integration and an example code snippet that performs the database integration`,
    schema: sourceFileSummarySchema
      .pick({
        purpose: true,
        implementation: true,
        tables: true,
        storedProcedures: true,
        triggers: true,
        databaseIntegration: true,
      })
      .extend({
        databaseIntegration: databaseIntegrationSchema.extend({
          mechanism: z.enum([
            "NONE",
            "DDL",
            "DML",
            "SQL",
            "STORED-PROCEDURE",
            "TRIGGER",
            "FUNCTION",
            "OTHER",
          ]),
        }),
      }),
    trickySchema: true,
  },
  xml: {
    fileContentDesc: "XML code",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}`,
    schema: sourceFileSummarySchema.pick({
      purpose: true,
      implementation: true,
    }),
    trickySchema: false,
  },
  jsp: {
    fileContentDesc: "JSP code",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* ${COMMON_INSTRUCTIONS.INTERNAL_REFS_JAVA}
* ${COMMON_INSTRUCTIONS.EXTERNAL_REFS_JAVA}    
* A list of data input fields it contains (if any). For each field, provide its name (or an approximate name), its type (e.g., 'text', 'hidden', 'password'), and a detailed description of its purpose.`,
    schema: sourceFileSummarySchema.pick({
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      dataInputFields: true,
    }),
    trickySchema: false,
  },
  markdown: {
    fileContentDesc: "Markdown content",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}`,
    schema: sourceFileSummarySchema.pick({
      purpose: true,
      implementation: true,
    }),
    trickySchema: false,
  },
} as const;
