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

export const javaPrompt: SourcePromptTemplate = {
  contentDesc: "JVM code",
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
      // Add descriptions for LLM prompts
      internalReferences: z.array(z.string()).describe("A list of internal classpaths referenced."),
      externalReferences: z
        .array(z.string())
        .describe("A list of third-party classpaths referenced."),
      databaseIntegration: databaseIntegrationSchema.extend({
        // Java-specific mechanisms only
        mechanism: z.enum([
          "NONE",
          "JDBC",
          "SPRING-DATA",
          "HIBERNATE",
          "JPA",
          "EJB",
          "REDIS",
          "ELASTICSEARCH",
          "CASSANDRA-CQL",
          "SQL",
          "ORM",
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
          // Restrict integration mechanisms to those typical in JVM ecosystems
          integrationEndpointSchema.extend({
            mechanism: z.enum([
              "REST",
              "SOAP",
              "JMS-QUEUE",
              "JMS-TOPIC",
              "KAFKA-TOPIC",
              "RABBITMQ-QUEUE",
              "RABBITMQ-EXCHANGE",
              "ACTIVEMQ-QUEUE",
              "ACTIVEMQ-TOPIC",
              "WEBSOCKET",
              "GRPC",
              "SSE",
              "OTHER",
            ]),
          }),
        )
        .optional(),
    }),
  instructions: [
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.BASIC_INFO,
      points: [
        ...CLASS_LANGUAGE_BASE_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
        SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
      points: [
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.PUBLIC_CONSTANTS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.PUBLIC_METHODS,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
      points: [
        SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTEGRATION_INSTRUCTIONS,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
      points: [
        ...DB_INTEGRATION_INSTRUCTIONS,
        SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.DB_MECHANISM_MAPPING,
      ],
    },
    {
      title: SOURCES_INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
      points: CODE_QUALITY_INSTRUCTIONS,
    },
  ],
};
