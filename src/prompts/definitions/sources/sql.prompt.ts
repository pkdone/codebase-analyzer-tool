import { sourceSummarySchema, databaseIntegrationSchema } from "../../../schemas/sources.schema";
import { z } from "zod";
import { SourcePromptTemplate } from "../../types/sources.types";
import { SOURCES_FRAGMENTS } from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";

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
      title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [SOURCES_FRAGMENTS.COMMON.PURPOSE, SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.DATABASE_OBJECTS,
      points: [
        SOURCES_FRAGMENTS.SQL_SPECIFIC.TABLE_LIST,
        SOURCES_FRAGMENTS.SQL_SPECIFIC.STORED_PROCEDURE_LIST,
        SOURCES_FRAGMENTS.SQL_SPECIFIC.TRIGGER_LIST,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
      points: [SOURCES_FRAGMENTS.SQL_SPECIFIC.DB_INTEGRATION_ANALYSIS],
    },
  ],
};
