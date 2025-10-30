import {
  sourceSummarySchema,
  databaseIntegrationSchema,
  integrationEndpointSchema,
} from "../../../schemas/sources.schema";
import { z } from "zod";
import { SourcePromptTemplate } from "../../types/sources.types";
import {
  SOURCES_FRAGMENTS,
  MODULE_LANGUAGE_BASE_INSTRUCTIONS,
  CODE_QUALITY_INSTRUCTIONS,
  DB_INTEGRATION_INSTRUCTIONS,
} from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";

export const rubyPrompt: SourcePromptTemplate = {
  contentDesc: "Ruby code",
  hasComplexSchema: true,
  responseSchema: sourceSummarySchema
    .pick({
      name: true,
      kind: true,
      namespace: true,
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      publicConstants: true,
      publicMethods: true,
      databaseIntegration: true,
      integrationPoints: true,
      codeQualityMetrics: true,
    })
    .extend({
      databaseIntegration: databaseIntegrationSchema.extend({
        // Ruby mechanisms
        mechanism: z.enum([
          "NONE",
          "ACTIVE-RECORD",
          "SEQUEL",
          "ORM",
          "MICRO-ORM",
          "REDIS",
          "SQL",
          "DRIVER",
          "DDL",
          "DML",
          "STORED-PROCEDURE",
          "TRIGGER",
          "FUNCTION",
          "OTHER",
        ]),
      }),
      integrationPoints: z
        .array(
          integrationEndpointSchema.extend({
            mechanism: z.enum([
              "REST",
              "GRAPHQL",
              "SOAP",
              "WEBSOCKET",
              "RABBITMQ-QUEUE",
              "RABBITMQ-EXCHANGE",
              "AWS-SQS",
              "AWS-SNS",
              "REDIS-PUBSUB",
              "SSE",
              "OTHER",
            ]),
          }),
        )
        .optional(),
    }),
  instructions: [
    {
      title: INSTRUCTION_SECTION_TITLES.CLASS_INFO,
      points: [...MODULE_LANGUAGE_BASE_INSTRUCTIONS, SOURCES_FRAGMENTS.RUBY_SPECIFIC.KIND_OVERRIDE],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.PURPOSE_AND_IMPLEMENTATION,
      points: [SOURCES_FRAGMENTS.COMMON.PURPOSE, SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.REFERENCES,
      points: [
        SOURCES_FRAGMENTS.RUBY_SPECIFIC.INTERNAL_REFS,
        SOURCES_FRAGMENTS.RUBY_SPECIFIC.EXTERNAL_REFS,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.PUBLIC_API,
      points: [
        SOURCES_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_CONSTANTS,
        SOURCES_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_METHODS,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
      points: [
        SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
        SOURCES_FRAGMENTS.RUBY_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
      points: [
        ...DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_FRAGMENTS.RUBY_SPECIFIC.DB_MECHANISM_MAPPING,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
      points: CODE_QUALITY_INSTRUCTIONS,
    },
  ],
};
