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
  DB_INTEGRATION_INSTRUCTIONS,
} from "../fragments";
import { INSTRUCTION_SECTION_TITLES } from "../instruction-titles";

export const pythonPrompt: SourcePromptTemplate = {
  contentDesc: "Python source code",
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
        // Python mechanisms
        mechanism: z.enum([
          "NONE",
          "SQLALCHEMY",
          "DJANGO-ORM",
          "ORM",
          "MICRO-ORM",
          "DRIVER",
          "SQL",
          "DDL",
          "DML",
          "STORED-PROCEDURE",
          "FUNCTION",
          "REDIS",
          "ELASTICSEARCH",
          "OTHER",
        ]),
      }),
      integrationPoints: z
        .array(
          integrationEndpointSchema.extend({
            mechanism: z.enum([
              "REST",
              "GRAPHQL",
              "GRPC",
              "WEBSOCKET",
              "RABBITMQ-QUEUE",
              "RABBITMQ-EXCHANGE",
              "KAFKA-TOPIC",
              "AWS-SQS",
              "AWS-SNS",
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
      title: INSTRUCTION_SECTION_TITLES.MODULE_INFO,
      points: [
        ...MODULE_LANGUAGE_BASE_INSTRUCTIONS,
        SOURCES_FRAGMENTS.PYTHON_SPECIFIC.KIND_OVERRIDE,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.PURPOSE_AND_IMPLEMENTATION,
      points: [SOURCES_FRAGMENTS.COMMON.PURPOSE, SOURCES_FRAGMENTS.COMMON.IMPLEMENTATION],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.REFERENCES,
      points: [
        SOURCES_FRAGMENTS.PYTHON_SPECIFIC.INTERNAL_REFS,
        SOURCES_FRAGMENTS.PYTHON_SPECIFIC.EXTERNAL_REFS,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.PUBLIC_API,
      points: [
        SOURCES_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_CONSTANTS,
        SOURCES_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_METHODS,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
      points: [
        SOURCES_FRAGMENTS.INTEGRATION_POINTS.INTRO,
        SOURCES_FRAGMENTS.PYTHON_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
      points: [
        ...DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_FRAGMENTS.PYTHON_SPECIFIC.DB_MECHANISM_MAPPING,
      ],
    },
    {
      title: INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
      points: [
        SOURCES_FRAGMENTS.CODE_QUALITY.INTRO,
        SOURCES_FRAGMENTS.PYTHON_SPECIFIC.PYTHON_COMPLEXITY_METRICS,
      ],
    },
  ],
};
