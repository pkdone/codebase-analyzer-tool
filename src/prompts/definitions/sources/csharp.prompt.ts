import {
  sourceSummarySchema,
  databaseIntegrationSchema,
  integrationEndpointSchema,
} from "../../../schemas/sources.schema";
import { z } from "zod";
import { SourcePromptTemplate } from "../../types/sources.types";
import {
  SOURCES_PROMPT_FRAGMENTS,
  CLASS_LANGUAGE_BASE_INSTRUCTIONS,
  CODE_QUALITY_INSTRUCTIONS,
  DB_INTEGRATION_INSTRUCTIONS,
} from "./common-fragments";
import { SOURCES_INSTRUCTION_SECTION_TITLES } from "./instruction-titles";

export const csharpPrompt: SourcePromptTemplate = {
  contentDesc: "C# source code",
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
        // C# / .NET mechanisms
        mechanism: z.enum([
          "NONE",
          "EF-CORE",
          "DAPPER",
          "MICRO-ORM",
          "ADO-NET",
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
              "SOAP",
              "GRPC",
              "RABBITMQ-QUEUE",
              "RABBITMQ-EXCHANGE",
              "AWS-SQS",
              "AWS-SNS",
              "AZURE-SERVICE-BUS-QUEUE",
              "AZURE-SERVICE-BUS-TOPIC",
              "WEBSOCKET",
              "SSE",
              "OTHER",
            ]),
          }),
        )
        .optional(),
    }),
  instructions: [
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.CLASS_INFO,
      points: [
        ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.KIND_OVERRIDE,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.PURPOSE_AND_IMPLEMENTATION,
      points: [
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.REFERENCES,
      points: [
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.INTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.EXTERNAL_REFS,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.PUBLIC_API,
      points: [
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.PUBLIC_CONSTANTS,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.PUBLIC_METHODS,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
      points: [
        SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
      points: [
        ...DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.CSHARP_SPECIFIC.DB_MECHANISM_MAPPING,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
      points: CODE_QUALITY_INSTRUCTIONS,
    },
  ],
};
