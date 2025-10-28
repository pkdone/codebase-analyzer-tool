import {
  sourceSummarySchema,
  databaseIntegrationSchema,
  integrationEndpointSchema,
} from "../../schemas/sources.schema";
import { z } from "zod";
import { SourcePromptTemplate, CanonicalFileType } from "../types/sources.types";
import {
  SOURCES_PROMPT_FRAGMENTS,
  CLASS_LANGUAGE_BASE_INSTRUCTIONS,
  MODULE_LANGUAGE_BASE_INSTRUCTIONS,
  CODE_QUALITY_INSTRUCTIONS,
  DB_INTEGRATION_INSTRUCTIONS,
} from "./sources-prompt-fragments";
import { SOURCES_INSTRUCTION_SECTION_TITLES } from "./sources-instruction-titles";

/**
 * Data-driven mapping of prompt types to their templates and schemas
 */
export const fileTypePromptMetadata: Record<CanonicalFileType, SourcePromptTemplate> = {
  //////////////////////////////////////////////////////////////////////////////////////////////////
  default: {
    contentDesc: "project file content",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      databaseIntegration: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION,
        points: [SOURCES_PROMPT_FRAGMENTS.DB_INTEGRATION.INTRO],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  java: {
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
        internalReferences: z
          .array(z.string())
          .describe("A list of internal classpaths referenced."),
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
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  javascript: {
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.BASIC_INFO,
        points: [
          SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.REFERENCES_AND_DEPS,
        points: [
          SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTERNAL_REFS,
          SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.EXTERNAL_REFS,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          SOURCES_PROMPT_FRAGMENTS.JAVASCRIPT_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  sql: {
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
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  xml: {
    contentDesc: "XML code",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      uiFramework: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.UI_FRAMEWORK_DETECTION,
        points: [SOURCES_PROMPT_FRAGMENTS.XML_SPECIFIC.UI_FRAMEWORK_DETECTION],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  jsp: {
    contentDesc: "JSP code",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      dataInputFields: true,
      jspMetrics: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.REFERENCES,
        points: [
          SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.INTERNAL_REFS,
          SOURCES_PROMPT_FRAGMENTS.JAVA_SPECIFIC.EXTERNAL_REFS,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.USER_INPUT_FIELDS,
        points: [SOURCES_PROMPT_FRAGMENTS.JSP_SPECIFIC.DATA_INPUT_FIELDS],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.JSP_METRICS_ANALYSIS,
        points: [SOURCES_PROMPT_FRAGMENTS.JSP_SPECIFIC.JSP_METRICS_ANALYSIS],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  markdown: {
    contentDesc: "Markdown content",
    hasComplexSchema: false,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
    }),
    instructions: [
      {
        points: [
          SOURCES_PROMPT_FRAGMENTS.COMMON.PURPOSE,
          SOURCES_PROMPT_FRAGMENTS.COMMON.IMPLEMENTATION,
        ],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  csharp: {
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
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  python: {
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.MODULE_INFO,
        points: [
          ...MODULE_LANGUAGE_BASE_INSTRUCTIONS,
          SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.KIND_OVERRIDE,
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
          SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.INTERNAL_REFS,
          SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.EXTERNAL_REFS,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.PUBLIC_API,
        points: [
          SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_CONSTANTS,
          SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PUBLIC_METHODS,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: [
          SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.INTRO,
          SOURCES_PROMPT_FRAGMENTS.PYTHON_SPECIFIC.PYTHON_COMPLEXITY_METRICS,
        ],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  ruby: {
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.CLASS_INFO,
        points: [
          ...MODULE_LANGUAGE_BASE_INSTRUCTIONS,
          SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.KIND_OVERRIDE,
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
          SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.INTERNAL_REFS,
          SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.EXTERNAL_REFS,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.PUBLIC_API,
        points: [
          SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_CONSTANTS,
          SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.PUBLIC_METHODS,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.INTEGRATION_POINTS,
        points: [
          SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
          SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.INTEGRATION_INSTRUCTIONS,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DATABASE_INTEGRATION_ANALYSIS,
        points: [
          ...DB_INTEGRATION_INSTRUCTIONS,
          SOURCES_PROMPT_FRAGMENTS.RUBY_SPECIFIC.DB_MECHANISM_MAPPING,
        ],
      },
      {
        title: SOURCES_INSTRUCTION_SECTION_TITLES.CODE_QUALITY_METRICS,
        points: CODE_QUALITY_INSTRUCTIONS,
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  maven: {
    contentDesc: "Maven POM (Project Object Model) build file",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DEPENDENCIES,
        points: [SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.MAVEN],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  gradle: {
    contentDesc: "Gradle build configuration file",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DEPENDENCIES,
        points: [SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.GRADLE],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  ant: {
    contentDesc: "Apache Ant build.xml file",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DEPENDENCIES,
        points: [SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.ANT],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  npm: {
    contentDesc: "npm package.json or lock file",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DEPENDENCIES,
        points: [SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.NPM],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  "dotnet-proj": {
    contentDesc: ".NET project file (.csproj, .vbproj, .fsproj)",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DEPENDENCIES,
        points: [SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.DOTNET],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  nuget: {
    contentDesc: "NuGet packages.config file (legacy .NET)",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DEPENDENCIES,
        points: [SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.NUGET],
      },
    ],
  },

  ////////////////////////////////////////////////////////////////////////////////////////////////////
  "ruby-bundler": {
    contentDesc: "Ruby Gemfile or Gemfile.lock",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DEPENDENCIES,
        points: [SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.RUBY_BUNDLER],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  "python-pip": {
    contentDesc: "Python requirements.txt or Pipfile",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DEPENDENCIES,
        points: [SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_PIP],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  "python-setup": {
    contentDesc: "Python setup.py file",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DEPENDENCIES,
        points: [SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_SETUP],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  "python-poetry": {
    contentDesc: "Python pyproject.toml (Poetry)",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.DEPENDENCIES,
        points: [SOURCES_PROMPT_FRAGMENTS.DEPENDENCY_EXTRACTION.PYTHON_POETRY],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  "shell-script": {
    contentDesc: "Shell script (bash/sh)",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
        points: [
          SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
          SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
          SOURCES_PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.CRON_EXPRESSIONS,
          SOURCES_PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.DATABASE_OPS,
          SOURCES_PROMPT_FRAGMENTS.SHELL_SCRIPT_SPECIFIC.EXTERNAL_API_CALLS,
        ],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  "batch-script": {
    contentDesc: "Windows batch script (.bat/.cmd)",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
        points: [
          SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
          SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
          SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.TASK_SCHEDULER,
          SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.DATABASE_OPS,
          SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.NETWORK_OPS,
          SOURCES_PROMPT_FRAGMENTS.BATCH_SCRIPT_SPECIFIC.SERVICE_OPS,
        ],
      },
    ],
  },

  //////////////////////////////////////////////////////////////////////////////////////////////////
  jcl: {
    contentDesc: "Mainframe JCL (Job Control Language)",
    hasComplexSchema: true,
    responseSchema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
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
        title: SOURCES_INSTRUCTION_SECTION_TITLES.SCHEDULED_JOBS,
        points: [
          SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
          SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
          SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.EXEC_STATEMENTS,
          SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.DD_STATEMENTS,
          SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.COND_PARAMETERS,
          SOURCES_PROMPT_FRAGMENTS.JCL_SPECIFIC.SORT_UTILITIES,
        ],
      },
    ],
  },
} as const;
