import { sourceSummarySchema, databaseIntegrationSchema } from "../../../schemas/sources.schema";
import { z } from "zod";
import { DynamicPromptConfig } from "../../../llm/types/llm.types";

/**
 * Common instruction phrases used across multiple file type templates
 */
const COMMON_INSTRUCTIONS = {
  PURPOSE: "A detailed definition of its purpose",
  IMPLEMENTATION: "A detailed definition of its implementation",
  DB_INTEGRATION:
    "The type of direct database integration via a driver / library / ORM / API it employs, if any (stating ONE recognized mechanism value in capitals, or NONE if the code does not interact with a database directly), plus: (a) a description of the integration mentioning technologies, tables / collections / models if inferable, and (b) an example code snippet that performs the database integration (keep snippet concise). Mechanism must be one of the enumerated values; unrecognized values will be coerced to OTHER.",
  INTERNAL_REFS_JAVA:
    "A list of the internal references to the classpaths of other classes and interfaces belonging to the same application referenced by the code of this class/interface (do not include standard Java SE, Java EE 'javax.*' classes or 3rd party library classes in the list of internal references)",
  INTERNAL_REFS_JS:
    "A list of the internal references to other modules used by this source file (by using `require` or `import` keywords) belonging to the same application referenced by the code in this source file (do not include external or 3rd party modules/libraries in the list of internal references)",
  EXTERNAL_REFS_JAVA:
    "A list of the external references to third-party classpath used by this source file, which do not belong to this same application that this class/interface file is part of",
  EXTERNAL_REFS_JS:
    "A list of the external references to other external modules/libraries used by this source file (by using `require` or `import` keywords), which do not belong to this same application that this source file is part of",
} as const;

/**
 * Supported file types for metadata configuration.
 * Ensures type safety and prevents typos when accessing file type configs.
 */
type SupportedFileType =
  | "java"
  | "javascript"
  | "default"
  | "sql"
  | "xml"
  | "jsp"
  | "markdown"
  | "csharp"
  | "ruby";

/**
 * Data-driven mapping of prompt types to their templates and schemas
 */
export const fileTypeMetadataConfig: Record<SupportedFileType, DynamicPromptConfig> & {
  default: DynamicPromptConfig;
} = {
  java: {
    contentDesc: "code",
    instructions: `* The name of the main public class/interface of the file
 * Its kind ('class' or 'interface')
 * Its namespace (classpath)
 * ${COMMON_INSTRUCTIONS.PURPOSE}
 * ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
 * ${COMMON_INSTRUCTIONS.INTERNAL_REFS_JAVA}
 * ${COMMON_INSTRUCTIONS.EXTERNAL_REFS_JAVA}
 * A list of public constants (name, value and type) it defines (if any)
 * A list of its public methods (if any) - for each public method, include the method's name, its purpose in detail, a list of its parameters, its return type and a very detailed description of its implementation
 * A list of integration points (REST APIs, SOAP services, message queues/topics, WebSockets, gRPC) this file defines or consumes - for each integration include: mechanism type, name, description, and relevant details. Look for:
   
   REST APIs (mechanism: 'REST'):
   - JAX-RS annotations (@Path, @GET, @POST, @PUT, @DELETE, @PATCH) - include path, method, request/response body
   - Spring annotations (@RestController, @RequestMapping, @GetMapping, @PostMapping, @PutMapping, @DeleteMapping, @PatchMapping)
   - Servlet mappings (web.xml or @WebServlet) - include URL patterns
   - HTTP client calls (RestTemplate, WebClient, HttpClient, OkHttp, Feign @FeignClient)
   
   SOAP Services (mechanism: 'SOAP'):
   - JAX-WS annotations (@WebService, @WebMethod, @SOAPBinding) - include service name, operation name, SOAP version
   - WSDL references or Apache CXF service definitions
   - SOAPConnectionFactory, SOAPMessage usage
   - SOAP client proxy usage (Service.create, getPort)
   
   JMS Messaging (mechanism: 'JMS-QUEUE' or 'JMS-TOPIC'):
   - Queue operations: MessageProducer sending to Queue, QueueSender, @JmsListener with destination type QUEUE
   - Topic operations: TopicPublisher, @JmsListener with destination type TOPIC
   - Include queue/topic name, message type, direction (PRODUCER/CONSUMER/BOTH)
   - ConnectionFactory, Session, MessageProducer/MessageConsumer patterns
   
   Kafka (mechanism: 'KAFKA-TOPIC'):
   - KafkaProducer, KafkaConsumer usage - include topic name, message type, direction
   - @KafkaListener annotations - include topic names, consumer group
   
   RabbitMQ (mechanism: 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'):
   - RabbitTemplate send/receive operations - include queue/exchange name
   - @RabbitListener annotations - include queue names, direction
   
   Other Messaging:
   - ActiveMQ: @JmsListener with ActiveMQ-specific config => 'ACTIVEMQ-QUEUE' or 'ACTIVEMQ-TOPIC'
   - AWS SQS/SNS: AmazonSQS client, sendMessage, receiveMessage => 'AWS-SQS' or 'AWS-SNS'
   - Azure Service Bus: ServiceBusClient, QueueClient, TopicClient => 'AZURE-SERVICE-BUS-QUEUE' or 'AZURE-SERVICE-BUS-TOPIC'
   
   WebSockets (mechanism: 'WEBSOCKET'):
   - @ServerEndpoint annotations - include endpoint path
   - WebSocketHandler implementations
   
   gRPC (mechanism: 'GRPC'):
   - @GrpcService annotations or gRPC stub usage - include service name, methods
 * The type of database integration it employs (if any), stating the mechanism used, a description of the integration and an example code snippet that performs the database integration - if any of the following elements are true in the code, you MUST assume that there is database interaction (if you know the table names the code interacts with, include these table names in the description):
   - Uses JDBC driver / JDBC API classes => mechanism: 'JDBC'
   - Contains inline SQL strings / queries (SELECT / UPDATE / etc.) => mechanism: 'SQL'
   - Uses raw database driver APIs (DataSource, Connection, etc.) without higher abstraction => mechanism: 'DRIVER'
   - Uses JPA, Hibernate, TopLink, EclipseLink, or other JPA-based ORMs => mechanism: 'ORM' (or 'HIBERNATE' / 'JPA' if explicitly distinguishable)
   - Uses Spring Data repositories / CrudRepository / JpaRepository => mechanism: 'SPRING-DATA'
   - Uses Enterprise Java Beans for persistence (CMP/BMP) => mechanism: 'EJB'
   - Defines DDL / migration style schema changes inline => mechanism: 'DDL'
   - Executes DML specific batch / manipulation blocks distinct from generic SQL => mechanism: 'DML'
   - Uses stored procedure invocation (CallableStatement etc.) => mechanism: 'STORED-PROCEDURE'
   - Uses trigger management code => mechanism: 'TRIGGER'
   - References a function creation / invocation construct => mechanism: 'FUNCTION'
   - Uses a 3rd party framework not otherwise categorized => mechanism: 'OTHER'
   - Otherwise, if the code does not use a database => mechanism: 'NONE'
    (note, JMS and JNDI are not related to interacting with a dataase)`,
    schema: sourceSummarySchema
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
    hasComplexSchema: false,
  },
  javascript: {
    contentDesc: "JavaScript/TypeScript code",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
 * ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
 * ${COMMON_INSTRUCTIONS.INTERNAL_REFS_JS}
 * ${COMMON_INSTRUCTIONS.EXTERNAL_REFS_JS}
 * A list of integration points (REST APIs, GraphQL, WebSockets, messaging systems, gRPC) this file defines or consumes - for each integration include: mechanism type, name, description, and relevant details. Look for:
   
   REST APIs (mechanism: 'REST'):
   - Express route definitions (app.get, app.post, app.put, app.delete, router.use)
   - Fastify route definitions (fastify.get, fastify.post, etc.)
   - Koa route definitions (router.get, router.post, etc.)
   - NestJS decorators (@Get, @Post, @Put, @Delete, @Patch, @Controller)
   - HTTP client calls (fetch, axios, request, superagent, got)
   
   GraphQL (mechanism: 'GRAPHQL'):
   - Schema definitions (type Query, type Mutation, resolvers)
   - Apollo Server or GraphQL Yoga setup
   - GraphQL client usage (Apollo Client, urql)
   
   tRPC (mechanism: 'TRPC'):
   - Procedure definitions (publicProcedure, protectedProcedure)
   - Router definitions
   
   WebSockets (mechanism: 'WEBSOCKET'):
   - Socket.io usage (io.on, socket.emit)
   - ws library (WebSocket server/client)
   - WebSocket API usage
   
   Messaging Systems:
   - RabbitMQ (amqplib): Channel.sendToQueue, consume => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
   - Kafka (kafkajs): producer.send, consumer.subscribe => 'KAFKA-TOPIC'
   - AWS SQS/SNS (aws-sdk): sendMessage, subscribe => 'AWS-SQS' or 'AWS-SNS'
   - Redis Pub/Sub: publish, subscribe => 'REDIS-PUBSUB'
   
   gRPC (mechanism: 'GRPC'):
   - @grpc/grpc-js usage, service definitions
   
   Server-Sent Events (mechanism: 'SSE'):
   - res.writeHead with text/event-stream
 * ${COMMON_INSTRUCTIONS.DB_INTEGRATION}.`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      databaseIntegration: true,
      integrationPoints: true,
    }),
    hasComplexSchema: false,
  },
  default: {
    contentDesc: "project file content",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* ${COMMON_INSTRUCTIONS.DB_INTEGRATION}.`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      databaseIntegration: true,
    }),
    hasComplexSchema: false,
  },
  sql: {
    contentDesc: "database DDL/DML/SQL code",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
 * ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
 * A list of the tables (if any) it defines - for each table, include the names of the table's fields, if known.
 * A list of the stored procedure (if any) it defines - for each stored procedure, include the stored procedure's name, its purpose, the number of lines of code in the stored procedure, and a complexity score or how complex the stored procedure's code is (the score must be have one of the following values: 'LOW', 'MEDIUM', 'HIGH') along with a short reason for the chosen complexity score.
 * A list of the triggers (if any) it defines - for each trigger, include the trigger's name, its purpose, the number of lines of code in the trigger, and a complexity score or how complex the trigger's code is (the score must be have one of the following values: 'LOW', 'MEDIUM', 'HIGH') along with a short reason for the chosen complexity score.
 * The most prominent type of database integration it employs (if any), stating the mechanism used ('NONE', 'DDL', 'DML', 'SQL', 'STORED-PROCEDURE', or 'TRIGGER'), a description of the integration and an example code snippet (maximum 6 lines of code) that performs the database integration`,
    schema: sourceSummarySchema
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
    hasComplexSchema: true,
  },
  xml: {
    contentDesc: "XML code",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
    }),
    hasComplexSchema: false,
  },
  jsp: {
    contentDesc: "JSP code",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* ${COMMON_INSTRUCTIONS.INTERNAL_REFS_JAVA}
* ${COMMON_INSTRUCTIONS.EXTERNAL_REFS_JAVA}    
* A list of data input fields it contains (if any). For each field, provide its name (or an approximate name), its type (e.g., 'text', 'hidden', 'password'), and a detailed description of its purpose.`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      dataInputFields: true,
    }),
    hasComplexSchema: false,
  },
  markdown: {
    contentDesc: "Markdown content",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
    }),
    hasComplexSchema: false,
  },
  csharp: {
    contentDesc: "C# source code",
    instructions: `* The name of the main public class/interface/record/struct of the file
 * Its kind ('class', 'interface', 'record', or 'struct')
 * Its Fully qualified type name (namespace)
 * ${COMMON_INSTRUCTIONS.PURPOSE}
 * ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
 * A list of the internal references to other application classes - fully qualified type names (only include 'using' directives that clearly belong to this same application's code – exclude BCL / System.* and third-party packages)
 * A list of the external references to 3rd party / NuGet package classes (Fully qualified type names) it depends on (exclude System.* where possible)
 * A list of public constants / readonly static fields (if any) – include name, value (redact secrets), and a short type/role description
 * A list of its public methods (if any) – for each method list: name, purpose (detailed), parameters (name and type), return type, async/sync indicator, and a very detailed implementation description highlighting notable control flow, LINQ queries, awaits, exception handling, and important business logic decisions
 * A list of integration points (REST APIs, WCF/SOAP, messaging systems, gRPC) this file defines or consumes - for each integration include: mechanism type, name, description, and relevant details. Look for:
   
   REST APIs (mechanism: 'REST'):
   - ASP.NET Core MVC/Web API controller actions with [HttpGet], [HttpPost], [HttpPut], [HttpDelete], [HttpPatch], [Route]
   - ASP.NET Core Minimal API endpoints (MapGet, MapPost, MapPut, MapDelete)
   - HTTP client calls (HttpClient, RestSharp, Refit interfaces)
   
   WCF/SOAP Services (mechanism: 'SOAP'):
   - WCF service contracts ([ServiceContract], [OperationContract])
   - SOAP service references, WCF client proxies
   - BasicHttpBinding, WSHttpBinding configurations
   
   Messaging Systems:
   - Azure Service Bus (ServiceBusClient, QueueClient for queues, TopicClient for topics) => 'AZURE-SERVICE-BUS-QUEUE' or 'AZURE-SERVICE-BUS-TOPIC'
   - RabbitMQ.Client usage (IModel.BasicPublish, BasicConsume) => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
   - MSMQ (MessageQueue class) => 'OTHER' (specify MSMQ in description and protocol)
   - AWS SQS/SNS (AWSSDK) => 'AWS-SQS' or 'AWS-SNS'
   
   gRPC (mechanism: 'GRPC'):
   - Grpc.Net.Client, Grpc.Core service definitions
   - gRPC client stubs and service implementations
 * The type of database integration it employs (if any), stating a mechanism (choose ONE of: 'ORM', 'SQL', 'DRIVER', 'DDL', or 'NONE'), a description of the integration, and a concise example snippet (max 8 lines) that performs the database integration. Apply these mapping rules:
   - Uses Entity Framework / EF Core DbContext / LINQ-to-Entities => mechanism: 'EF-CORE'
   - Uses Dapper extension methods / micro ORM => mechanism: 'DAPPER' (or 'MICRO-ORM' if pattern is generic and not clearly Dapper)
   - Uses another identifiable micro ORM (e.g., NPoco, ServiceStack.OrmLite) => mechanism: 'MICRO-ORM'
   - Executes raw SQL strings or stored procedure calls via ADO.NET (SqlCommand, DbCommand, etc.) => mechanism: 'SQL'
   - Invokes stored procedures explicitly (CommandType.StoredProcedure) => mechanism: 'STORED-PROCEDURE'
   - Uses lower-level provider / driver-specific APIs directly (e.g., NpgsqlConnection, SqlConnection without ORM abstractions) => mechanism: 'ADO-NET' (if clearly ADO.NET primitives) else 'DRIVER'
   - Contains explicit migration / schema DDL (CREATE/ALTER/DROP TABLE) => mechanism: 'DDL'
   - Performs primarily data manipulation statements distinct from schema (bulk INSERT batches, multi-row UPDATE sequences) => mechanism: 'DML'
   - Creates database functions or executes function creation scripts => mechanism: 'FUNCTION'
   - Otherwise when no DB interaction present => mechanism: 'NONE'`,
    schema: sourceSummarySchema.pick({
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
    }),
    hasComplexSchema: false,
  },
  ruby: {
    contentDesc: "Ruby code",
    instructions: `* The name of the main public class/module of the file
 * Its kind ('class', 'module', or 'enum')
 * Its namespace (fully qualified module path)
 * ${COMMON_INSTRUCTIONS.PURPOSE}
 * ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
 * A list of the internal references to other Ruby source files in the same project that this file depends on (only include paths required via require or require_relative that clearly belong to this same application; exclude Ruby standard library and external gem dependencies) 
 * A list of the external references to gem / third-party libraries it depends on (as required via require / require_relative) that are NOT part of this application's own code (exclude Ruby standard library modules)
 * A list of public (non-internal) constants it defines (if any) – for each constant include its name, value (redact secrets), and a short type/role description
 * A list of its public methods (if any) – for each method include: name, purpose (in detail), its parameters (with names), what it returns (describe the value; Ruby is dynamically typed so describe the shape / meaning), and a very detailed description of how it is implemented / key logic / important guards or conditionals
 * A list of integration points (REST APIs, GraphQL, SOAP, messaging systems) this file defines or consumes - for each integration include: mechanism type, name, description, and relevant details. Look for:
   
   REST APIs (mechanism: 'REST'):
   - Rails controller actions (routes.rb get/post/put/delete/patch, controller action methods)
   - Sinatra route definitions (get, post, put, delete, patch blocks)
   - Grape API endpoints (get, post, put, delete, patch declarations)
   - HTTP client calls (Net::HTTP, RestClient, HTTParty, Faraday)
   
   GraphQL (mechanism: 'GRAPHQL'):
   - GraphQL type definitions (GraphQL::ObjectType, field definitions)
   - GraphQL mutations and queries
   
   SOAP (mechanism: 'SOAP'):
   - Savon SOAP client usage
   - SOAP service definitions
   
   Messaging Systems:
   - RabbitMQ (bunny gem): channel.queue, publish => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
   - Redis Pub/Sub: redis.publish, subscribe => 'REDIS-PUBSUB'
   - AWS SQS/SNS (aws-sdk) => 'AWS-SQS' or 'AWS-SNS'
   
   WebSockets (mechanism: 'WEBSOCKET'):
   - Action Cable channels
   - WebSocket-Rails usage
 * The type of database integration it employs (if any), stating the mechanism used, a description of the integration and an example code snippet (max 8 lines) that performs the database integration. If any of the following are present you MUST assume database interaction (include table/model names where you can infer them):
   - Uses ActiveRecord models, migrations, or associations => mechanism: 'ACTIVE-RECORD'
   - Uses Sequel ORM DSL => mechanism: 'SEQUEL'
   - Uses other Ruby ORM / micro ORM (ROM.rb etc.) => mechanism: 'ORM' (or 'MICRO-ORM' if clearly a lightweight micro ORM abstraction)
   - Executes raw SQL strings (SELECT / INSERT / etc.) => mechanism: 'SQL'
   - Invokes stored procedures (via connection.exec with call syntax) => mechanism: 'STORED-PROCEDURE'
   - Uses database driver / adapter directly (e.g., PG, mysql2) without ORM abstractions => mechanism: 'DRIVER'
   - Defines migration DSL altering/creating tables (create_table / add_column ...) => mechanism: 'DDL'
   - Performs data manipulation DML-only scripts distinct from schema (bulk insert helpers, data seeding logic) => mechanism: 'DML'
   - Creates triggers (via execute or DSL) => mechanism: 'TRIGGER'
   - Creates functions / stored routines => mechanism: 'FUNCTION'
   - Otherwise, if no database interaction is evident => mechanism: 'NONE'`,
    schema: sourceSummarySchema.pick({
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
    }),
    hasComplexSchema: false,
  },
} as const;
