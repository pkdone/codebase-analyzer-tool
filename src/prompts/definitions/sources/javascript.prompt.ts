import {
  sourceSummarySchema,
  databaseIntegrationSchema,
  integrationEndpointSchema,
} from "../../../schemas/sources.schema";
import { z } from "zod";
import { SourcePromptTemplate } from "../../types/sources.types";
import {
  SOURCES_FRAGMENTS,
  CODE_QUALITY_INSTRUCTIONS,
  DB_INTEGRATION_INSTRUCTIONS,
} from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";

export const javascriptPrompt: SourcePromptTemplate = {
  contentDesc: "JavaScript/TypeScript code",
  hasComplexSchema: true,
  responseSchema: sourceSummarySchema
    .pick({
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      databaseIntegration: true,
      integrationPoints: true,
      codeQualityMetrics: true,
    })
    .extend({
      databaseIntegration: databaseIntegrationSchema.extend({
        // JavaScript / TypeScript ecosystem mechanisms
        mechanism: z.enum([
          "NONE",
          "MONGOOSE",
          "PRISMA",
          "TYPEORM",
          "SEQUELIZE",
          "KNEX",
          "DRIZZLE",
          "MQL",
          "REDIS",
          "ELASTICSEARCH",
          "CASSANDRA-CQL",
          "SQL",
          "ORM",
          "MICRO-ORM",
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
              "TRPC",
              "GRPC",
              "WEBSOCKET",
              "RABBITMQ-QUEUE",
              "RABBITMQ-EXCHANGE",
              "KAFKA-TOPIC",
              "AWS-SQS",
              "AWS-SNS",
              "AZURE-SERVICE-BUS-QUEUE",
              "AZURE-SERVICE-BUS-TOPIC",
              "REDIS-PUBSUB",
              "SSE",
              "WEBHOOK",
              "OTHER",
            ]),
          }),
        )
        .optional(),
    }),
  instructions: [
    {
      title: INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [SOURCES_FRAGMENTS.COMMON.PURPOSE, SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
      points: [
        SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS,
        SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
      points: [
        SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
        SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
      points: [
        ...DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_FRAGMENTS.JAVASCRIPT_SPECIFIC.DB_MECHANISM_MAPPING,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
      points: CODE_QUALITY_INSTRUCTIONS,
    },
  ],
};
