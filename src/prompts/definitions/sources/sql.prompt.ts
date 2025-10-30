import { sourceSummarySchema, databaseIntegrationSchema } from "../../../schemas/sources.schema";
import { z } from "zod";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_PROMPT_FRAGMENTS } from "./common-fragments";
import { SOURCES_INSTRUCTION_SECTION_TITLES } from "./instruction-titles";

export const sqlPrompt: SourcePromptTemplate = {
  contentDesc: "database DDL/DML/SQL code",
  hasComplexSchema: true,
  responseSchema: sourceSummarySchema
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
  instructions: [
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.DATABASE_OBJECTS,
      points: [
        SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.TABLE_LIST,
        SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.STORED_PROCEDURE_LIST,
        SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.TRIGGER_LIST,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
      points: [SOURCES_PROMPT_FRAGMENTS.SQL_SPECIFIC.DB_INTEGRATION_ANALYSIS],
    },
  ],
};
