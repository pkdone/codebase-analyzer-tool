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
  | "ruby"
  | "maven"
  | "gradle"
  | "ant"
  | "npm"
  | "dotnet-proj"
  | "nuget"
  | "ruby-bundler"
  | "python-pip"
  | "python-setup"
  | "python-poetry"
  | "shell-script"
  | "batch-script"
  | "jcl";

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

 * CRITICAL: Database Integration Analysis (REQUIRED for files that interact with databases)
   
   For files that interact with a database, you MUST extract and provide ALL of the following fields in the databaseIntegration object. DO NOT omit any field - if you cannot determine a value, use "unknown" or indicate "not identifiable from code":
   
   REQUIRED FIELDS:
   - mechanism (REQUIRED): The integration type - see mechanism mapping below
   - description (REQUIRED): Detailed explanation of how database integration is achieved
   - codeExample (REQUIRED): A small redacted code snippet showing the database interaction
   
   STRONGLY RECOMMENDED FIELDS (provide whenever possible):
   - name: Name of the database service or data access component (e.g., "UserRepository", "OrderDAO", "DatabaseConfig")
   - databaseName: Specific database/schema name being accessed (look in connection strings, config files, or annotations)
   - tablesAccessed: Array of table/collection/entity names accessed (from SQL queries, JPA entity names, @Table annotations, repository interfaces)
   - operationType: Array of operation types - ['READ'], ['WRITE'], ['READ', 'WRITE'], ['DDL'], or ['ADMIN']
     * READ: only SELECT/find queries
     * WRITE: only INSERT/UPDATE/DELETE operations
     * READ_WRITE: both read and write operations
     * DDL: schema changes (CREATE TABLE, ALTER TABLE, migrations)
     * ADMIN: database administration operations
   - queryPatterns: Description of query complexity (e.g., 'simple CRUD', 'complex joins with subqueries', 'aggregations', 'stored procedure calls', 'batch operations')
   - transactionHandling: How transactions are managed (e.g., 'Spring @Transactional', 'manual tx.commit()', 'JPA EntityTransaction', 'auto-commit', 'none', 'unknown')
   - protocol: Database type and version (e.g., 'PostgreSQL 15', 'MySQL 8.0', 'MongoDB 6.0', 'Oracle 19c', 'H2', 'SQL Server 2019')
   - connectionInfo: JDBC URL or connection string - MUST REDACT passwords/secrets (e.g., 'jdbc:postgresql://localhost:5432/mydb', 'mongodb://localhost:27017/appdb')
   
   Mechanism mapping - if any of the following are true, you MUST assume database interaction:
   - Uses JDBC driver / JDBC API classes => mechanism: 'JDBC'
   - Uses Spring Data repositories (CrudRepository, JpaRepository, MongoRepository, etc.) => mechanism: 'SPRING-DATA'
   - Uses Hibernate API directly (SessionFactory, Session, Criteria API) => mechanism: 'HIBERNATE'
   - Uses standard JPA annotations and EntityManager (without Spring Data) => mechanism: 'JPA'
   - Uses Enterprise Java Beans for persistence (CMP/BMP, @Entity with EJB) => mechanism: 'EJB'
   - Contains inline SQL strings / queries (SELECT / UPDATE / etc.) without ORM => mechanism: 'SQL'
   - Uses raw database driver APIs (DataSource, Connection, etc.) without higher abstraction => mechanism: 'DRIVER'
   - Uses other JPA-based ORMs (TopLink, EclipseLink) not clearly Hibernate => mechanism: 'ORM'
   - Defines DDL / migration style schema changes inline => mechanism: 'DDL'
   - Executes DML specific batch / manipulation blocks distinct from generic SQL => mechanism: 'DML'
   - Invokes stored procedures (CallableStatement, @Procedure, etc.) => mechanism: 'STORED-PROCEDURE'
   - Creates or manages database triggers => mechanism: 'TRIGGER'
   - Creates or invokes database functions => mechanism: 'FUNCTION'
   - Uses Redis client (Jedis, Lettuce) => mechanism: 'REDIS'
   - Uses Elasticsearch client (RestHighLevelClient, ElasticsearchTemplate) => mechanism: 'ELASTICSEARCH'
   - Uses Cassandra CQL (CqlSession, @Query with CQL) => mechanism: 'CASSANDRA-CQL'
   - Uses a 3rd party framework not otherwise categorized => mechanism: 'OTHER'
   - Otherwise, if the code does not use a database => mechanism: 'NONE'
    (note, JMS and JNDI are not related to interacting with a database)

 * CRITICAL: Code Quality Analysis (REQUIRED for all code files with methods)
   
   For each public method you identify, you MUST estimate and provide:
   - cyclomaticComplexity: Estimate the cyclomatic complexity by counting decision points (if, else, for, while, case, catch, &&, ||, ?:). A simple method with no branches = 1. Add 1 for each decision point.
   - linesOfCode: Count actual lines of code (exclude blank lines and comments)
   - codeSmells: Identify any of these common code smells present in the method:
     * 'Long Method' - method has > 50 lines of code
     * 'Long Parameter List' - method has > 5 parameters
     * 'Complex Conditional' - deeply nested if/else or complex boolean expressions
     * 'Duplicate Code' - similar logic repeated in multiple places
     * 'Magic Numbers' - hardcoded numeric values without explanation
     * 'Deep Nesting' - more than 3-4 levels of nesting
     * 'Dead Code' - unreachable or commented-out code
   
   Additionally, provide file-level codeQualityMetrics:
   - totalMethods: Count of all methods in the file
   - averageComplexity: Average of all method complexities
   - maxComplexity: Highest complexity score in the file
   - averageMethodLength: Average lines of code per method
   - fileSmells: File-level smells such as:
     * 'God Class' - class has > 20 methods or > 500 lines of code
     * 'Too Many Methods' - class has > 20 public methods
     * 'Feature Envy' - methods heavily use data from other classes
     * 'Data Class' - class only contains fields and getters/setters
     * 'Refused Bequest' - subclass doesn't use inherited methods`,
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

 * CRITICAL: Database Integration Analysis (REQUIRED for files that interact with databases)
   
   For files that interact with a database, you MUST provide ALL of the following fields in the databaseIntegration object. Extract as much information as possible - if a field cannot be determined, use "unknown" or "not identifiable":
   
   REQUIRED: mechanism (see mapping below), description (detailed explanation), codeExample (small redacted snippet)
   STRONGLY RECOMMENDED (extract whenever possible): name (e.g., "UserModel", "database.js"), databaseName (specific DB/schema name), tablesAccessed (array of table/collection/model names from code), operationType (array: ['READ'], ['WRITE'], ['READ', 'WRITE'], ['DDL'], ['ADMIN']), queryPatterns (e.g., 'Mongoose schemas', 'Prisma ORM queries', 'TypeORM repositories', 'complex aggregations'), transactionHandling (e.g., 'Mongoose transactions', 'Prisma $transaction', 'manual begin/commit', 'none'), protocol (e.g., 'MongoDB 6.0', 'PostgreSQL 14'), connectionInfo (connection string with REDACTED credentials)
   
   Mechanism mapping:
   - Uses Mongoose schemas/models (mongoose.model, Schema) => mechanism: 'MONGOOSE'
   - Uses Prisma Client (PrismaClient, prisma.user.findMany) => mechanism: 'PRISMA'
   - Uses TypeORM (Repository, EntityManager, @Entity decorators) => mechanism: 'TYPEORM'
   - Uses Sequelize models (sequelize.define, Model.findAll) => mechanism: 'SEQUELIZE'
   - Uses Knex query builder (knex.select, knex('table')) => mechanism: 'KNEX'
   - Uses Drizzle ORM (drizzle, select, insert) => mechanism: 'DRIZZLE'
   - Uses Redis client (redis.set, redis.get, ioredis) => mechanism: 'REDIS'
   - Uses Elasticsearch client (@elastic/elasticsearch, client.search) => mechanism: 'ELASTICSEARCH'
   - Uses Cassandra driver (cassandra-driver, client.execute with CQL) => mechanism: 'CASSANDRA-CQL'
   - Uses MongoDB driver directly (MongoClient, db.collection) without Mongoose => mechanism: 'MQL'
   - Contains raw SQL strings without ORM => mechanism: 'SQL'
   - Uses generic database driver (pg, mysql2, tedious) without ORM => mechanism: 'DRIVER'
   - Defines DDL / migration scripts => mechanism: 'DDL'
   - Performs data manipulation (bulk operations, seeding) => mechanism: 'DML'
   - Otherwise, if no database interaction => mechanism: 'NONE'

 * CRITICAL: Code Quality Analysis (REQUIRED for all code files with methods)
   
   For each public method/function you identify, you MUST estimate and provide:
   - cyclomaticComplexity: Estimate the cyclomatic complexity by counting decision points (if, else, for, while, switch/case, catch, &&, ||, ?:). A simple function with no branches = 1. Add 1 for each decision point.
   - linesOfCode: Count actual lines of code (exclude blank lines and comments)
   - codeSmells: Identify any of these common code smells present:
     * 'Long Method' - function has > 50 lines of code
     * 'Long Parameter List' - function has > 5 parameters
     * 'Complex Conditional' - deeply nested if/else or complex boolean expressions
     * 'Duplicate Code' - similar logic repeated in multiple places
     * 'Magic Numbers' - hardcoded numeric values without explanation
     * 'Deep Nesting' - more than 3-4 levels of nesting
     * 'Dead Code' - unreachable or commented-out code
   
   Additionally, provide file-level codeQualityMetrics:
   - totalMethods: Count of all functions/methods in the file
   - averageComplexity: Average of all function complexities
   - maxComplexity: Highest complexity score in the file
   - averageMethodLength: Average lines of code per function
   - fileSmells: File-level smells such as:
     * 'God Class' - file has > 20 functions or > 500 lines of code
     * 'Too Many Methods' - file has > 20 exported functions
     * 'Feature Envy' - functions heavily use data from other modules`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      databaseIntegration: true,
      integrationPoints: true,
      codeQualityMetrics: true,
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
 * CRITICAL: Database Integration Analysis (REQUIRED) - Extract ALL possible database details:
   REQUIRED: mechanism (must be 'NONE', 'DDL', 'DML', 'SQL', 'STORED-PROCEDURE', or 'TRIGGER'), description (detailed explanation), codeExample (max 6 lines)
   STRONGLY RECOMMENDED (extract whenever possible): databaseName (specific database/schema name if mentioned), tablesAccessed (array of table names from queries or DDL), operationType (array: ['READ'], ['WRITE'], ['READ', 'WRITE'], ['DDL'], ['ADMIN']), queryPatterns (e.g., 'CREATE TABLE statements', 'INSERT/UPDATE operations', 'complex joins', 'stored procedures'), transactionHandling (e.g., 'explicit BEGIN/COMMIT', 'auto-commit', 'none'), protocol (database type and version if identifiable, e.g., 'PostgreSQL 14', 'MySQL 8.0', 'SQL Server 2019', 'Oracle 19c'), connectionInfo ('not applicable for SQL files' or specific connection details if present)`,
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
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}

* CRITICAL: UI Framework Detection (REQUIRED for web application config files)
  If this XML file is a web application configuration file, you MUST analyze and identify the UI framework:
  
  Struts Framework Detection:
  - Look for <servlet-class> containing "org.apache.struts.action.ActionServlet" or "StrutsPrepareAndExecuteFilter"
  - Check for <servlet-name> with "action" or "struts"
  - Look for DOCTYPE or root element referencing struts-config
  - Extract version from DTD/XSD if available (e.g., "struts-config_1_3.dtd" => version "1.3")
  - If detected, provide: { name: "Struts", version: "X.X" (if found), configFile: <current file path> }
  
  JSF (JavaServer Faces) Framework Detection:
  - Look for <servlet-class> containing "javax.faces.webapp.FacesServlet" or "jakarta.faces.webapp.FacesServlet"
  - Check for root element <faces-config> in faces-config.xml
  - Extract version from namespace (e.g., "http://xmlns.jcp.org/xml/ns/javaee" with version="2.2")
  - If detected, provide: { name: "JSF", version: "X.X" (if found), configFile: <current file path> }
  
  Spring MVC Framework Detection:
  - Look for <servlet-class> containing "org.springframework.web.servlet.DispatcherServlet"
  - Check for root element containing "http://www.springframework.org/schema/mvc"
  - Look for annotations like @Controller, @RequestMapping in servlet definitions
  - If detected, provide: { name: "Spring MVC", version: <if identifiable>, configFile: <current file path> }
  
  If a UI framework is detected, populate the uiFramework field. Otherwise, leave it undefined.`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      uiFramework: true,
    }),
    hasComplexSchema: false,
  },
  jsp: {
    contentDesc: "JSP code",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* ${COMMON_INSTRUCTIONS.INTERNAL_REFS_JAVA}
* ${COMMON_INSTRUCTIONS.EXTERNAL_REFS_JAVA}    
* A list of data input fields it contains (if any). For each field, provide its name (or an approximate name), its type (e.g., 'text', 'hidden', 'password'), and a detailed description of its purpose.

* CRITICAL: JSP Metrics Analysis (REQUIRED for all JSP files)
  You MUST analyze and provide the following JSP metrics in the jspMetrics object:
  - scriptletCount (REQUIRED): Count the exact number of Java scriptlets (<% ... %>) in this file
  - expressionCount (REQUIRED): Count the exact number of expressions (<%= ... %>) in this file
  - declarationCount (REQUIRED): Count the exact number of declarations (<%! ... %>) in this file
  - customTags (REQUIRED if any exist): For each <%@ taglib ... %> directive, extract:
    * prefix: The tag library prefix from the taglib directive
    * uri: The URI of the tag library from the taglib directive
  
  Examples:
  - <%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %> => { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }
  - <%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %> => { prefix: "fmt", uri: "http://java.sun.com/jsp/jstl/fmt" }
  - <%@ taglib prefix="custom" uri="/WEB-INF/custom.tld" %> => { prefix: "custom", uri: "/WEB-INF/custom.tld" }
  
  Note: Do NOT count directive tags (<%@ ... %>) or action tags (<jsp:... />) as scriptlets. Only count code blocks with <% %>, <%= %>, and <%! %>.`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      internalReferences: true,
      externalReferences: true,
      dataInputFields: true,
      jspMetrics: true,
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

 * CRITICAL: Database Integration Analysis (REQUIRED for files that interact with databases)
   
   For files that interact with a database, you MUST provide ALL of the following fields in the databaseIntegration object. Extract as much detail as possible - if a field cannot be determined, indicate "unknown" or "not identifiable":
   
   REQUIRED: mechanism (see mapping below), description (detailed explanation), codeExample (max 8 lines, redacted)
   STRONGLY RECOMMENDED (extract whenever possible): name (e.g., "ApplicationDbContext", "UserRepository"), databaseName (specific database/schema name), tablesAccessed (array of table/entity names from DbSet properties, queries, or attributes), operationType (array: ['READ'], ['WRITE'], ['READ', 'WRITE'], ['DDL'], ['ADMIN']), queryPatterns (e.g., 'EF Core LINQ queries', 'Dapper parameterized SQL', 'stored procedure calls', 'raw SQL'), transactionHandling (e.g., 'DbContext.SaveChanges with transactions', 'TransactionScope', 'manual SqlTransaction', 'none'), protocol (e.g., 'SQL Server 2019', 'PostgreSQL 14', 'MySQL 8.0'), connectionInfo (connection string with REDACTED passwords)
   
   Mechanism mapping:
   - Uses Entity Framework / EF Core (DbContext, LINQ-to-Entities, DbSet) => mechanism: 'EF-CORE'
   - Uses Dapper extension methods (Query<T>, Execute, QueryAsync) => mechanism: 'DAPPER'
   - Uses other micro ORMs (NPoco, ServiceStack.OrmLite, PetaPoco) => mechanism: 'MICRO-ORM'
   - Uses ADO.NET primitives (SqlConnection, SqlCommand, DataReader) without ORM => mechanism: 'ADO-NET'
   - Executes raw SQL strings or stored procedures via SqlCommand => mechanism: 'SQL'
   - Invokes stored procedures explicitly (CommandType.StoredProcedure) => mechanism: 'STORED-PROCEDURE'
   - Uses database provider drivers directly (NpgsqlConnection, MySqlConnection) without abstraction => mechanism: 'DRIVER'
   - Contains EF Core migrations or explicit DDL (CREATE/ALTER/DROP TABLE) => mechanism: 'DDL'
   - Performs data manipulation operations (bulk INSERT, SqlBulkCopy) => mechanism: 'DML'
   - Creates or invokes database functions => mechanism: 'FUNCTION'
   - Uses Redis client (StackExchange.Redis) => mechanism: 'REDIS'
   - Uses Elasticsearch.Net client => mechanism: 'ELASTICSEARCH'
   - Otherwise when no DB interaction present => mechanism: 'NONE'

 * CRITICAL: Code Quality Analysis (REQUIRED for all code files with methods)
   
   For each public method you identify, you MUST estimate and provide:
   - cyclomaticComplexity: Estimate the cyclomatic complexity by counting decision points (if, else, for, while, foreach, switch/case, catch, &&, ||, ?:, ??). A simple method with no branches = 1. Add 1 for each decision point.
   - linesOfCode: Count actual lines of code (exclude blank lines and comments)
   - codeSmells: Identify any of these common code smells present in the method:
     * 'Long Method' - method has > 50 lines of code
     * 'Long Parameter List' - method has > 5 parameters
     * 'Complex Conditional' - deeply nested if/else or complex boolean expressions
     * 'Duplicate Code' - similar logic repeated in multiple places
     * 'Magic Numbers' - hardcoded numeric values without explanation
     * 'Deep Nesting' - more than 3-4 levels of nesting
     * 'Dead Code' - unreachable or commented-out code
   
   Additionally, provide file-level codeQualityMetrics:
   - totalMethods: Count of all methods in the file
   - averageComplexity: Average of all method complexities
   - maxComplexity: Highest complexity score in the file
   - averageMethodLength: Average lines of code per method
   - fileSmells: File-level smells such as:
     * 'God Class' - class has > 20 methods or > 500 lines of code
     * 'Too Many Methods' - class has > 20 public methods
     * 'Feature Envy' - methods heavily use data from other classes
     * 'Data Class' - class only contains properties and getters/setters`,
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
      codeQualityMetrics: true,
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

 * CRITICAL: Database Integration Analysis (REQUIRED for files that interact with databases)
   
   For files that interact with a database, you MUST provide ALL of the following fields in the databaseIntegration object. Extract as much detail as possible - if a field cannot be determined, indicate "unknown" or "not identifiable":
   
   REQUIRED: mechanism (see mapping below), description (detailed explanation), codeExample (max 8 lines, redacted)
   STRONGLY RECOMMENDED (extract whenever possible): name (e.g., "User model", "DatabaseConnection"), databaseName (specific database/schema name), tablesAccessed (array of table/model names from ActiveRecord models, queries, or table references), operationType (array: ['READ'], ['WRITE'], ['READ', 'WRITE'], ['DDL'], ['ADMIN']), queryPatterns (e.g., 'ActiveRecord queries', 'raw SQL with params', 'Sequel dataset operations', 'complex joins'), transactionHandling (e.g., 'ActiveRecord transactions', 'Sequel database.transaction', 'manual BEGIN/COMMIT', 'none'), protocol (e.g., 'PostgreSQL 14', 'MySQL 8.0', 'SQLite'), connectionInfo (database.yml config or connection string with REDACTED credentials)
   
   Mechanism mapping - if any of the following are present you MUST assume database interaction (include table/model names where you can infer them):
   - Uses ActiveRecord (models, migrations, associations, where/find methods) => mechanism: 'ACTIVE-RECORD'
   - Uses Sequel ORM (DB[:table], dataset operations) => mechanism: 'SEQUEL'
   - Uses other Ruby ORM / micro ORM (ROM.rb, DataMapper) => mechanism: 'ORM' (or 'MICRO-ORM' if lightweight)
   - Uses Redis client (redis-rb, redis.set/get) => mechanism: 'REDIS'
   - Executes raw SQL strings (SELECT / INSERT / etc.) => mechanism: 'SQL'
   - Invokes stored procedures (via connection.exec with CALL) => mechanism: 'STORED-PROCEDURE'
   - Uses database driver / adapter directly (PG gem, mysql2 gem) without ORM => mechanism: 'DRIVER'
   - Defines migration DSL (create_table, add_column, change_table) => mechanism: 'DDL'
   - Performs data manipulation (bulk insert helpers, seeding, data-only scripts) => mechanism: 'DML'
   - Creates or manages triggers (via execute or DSL) => mechanism: 'TRIGGER'
   - Creates or invokes functions / stored routines => mechanism: 'FUNCTION'
   - Otherwise, if no database interaction is evident => mechanism: 'NONE'

 * CRITICAL: Code Quality Analysis (REQUIRED for all code files with methods)
   
   For each public method you identify, you MUST estimate and provide:
   - cyclomaticComplexity: Estimate the cyclomatic complexity by counting decision points (if, elsif, unless, for, while, until, case/when, rescue, &&, ||, ?:). A simple method with no branches = 1. Add 1 for each decision point.
   - linesOfCode: Count actual lines of code (exclude blank lines and comments)
   - codeSmells: Identify any of these common code smells present in the method:
     * 'Long Method' - method has > 50 lines of code
     * 'Long Parameter List' - method has > 5 parameters
     * 'Complex Conditional' - deeply nested if/else or complex boolean expressions
     * 'Duplicate Code' - similar logic repeated in multiple places
     * 'Magic Numbers' - hardcoded numeric values without explanation
     * 'Deep Nesting' - more than 3-4 levels of nesting
     * 'Dead Code' - unreachable or commented-out code
   
   Additionally, provide file-level codeQualityMetrics:
   - totalMethods: Count of all methods in the file
   - averageComplexity: Average of all method complexities
   - maxComplexity: Highest complexity score in the file
   - averageMethodLength: Average lines of code per method
   - fileSmells: File-level smells such as:
     * 'God Class' - class has > 20 methods or > 500 lines of code
     * 'Too Many Methods' - class has > 20 public methods
     * 'Feature Envy' - methods heavily use data from other classes`,
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
      codeQualityMetrics: true,
    }),
    hasComplexSchema: false,
  },
  maven: {
    contentDesc: "Maven POM (Project Object Model) build file",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A comprehensive list of dependencies declared in this POM file - for each dependency extract:
  - name (artifactId)
  - groupId
  - version (resolve properties if possible, e.g., \${spring.version})
  - scope (compile, test, runtime, provided, import, system)
  - type (jar, war, pom, etc.)
* Note: Extract dependencies from both <dependencies> and <dependencyManagement> sections`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
    hasComplexSchema: false,
  },
  gradle: {
    contentDesc: "Gradle build configuration file",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A comprehensive list of dependencies declared - for each dependency extract:
  - name (artifact name after the colon, e.g., for 'org.springframework:spring-core:5.3.9' the name is 'spring-core')
  - groupId (group before the colon, e.g., 'org.springframework')
  - version (version number, or 'latest' if using dynamic versions)
  - scope (implementation, api, testImplementation, runtimeOnly, etc. - map these to standard Maven scopes)
* Handle both Groovy DSL and Kotlin DSL syntax`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
    hasComplexSchema: false,
  },
  ant: {
    contentDesc: "Apache Ant build.xml file",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A comprehensive list of dependencies declared - for each dependency extract:
  - name (jar file name or artifact name)
  - groupId (organization or project name if specified)
  - version (extract from jar filename if versioned, e.g., 'commons-lang3-3.12.0.jar' -> version: '3.12.0')
  - scope (compile, test, runtime based on classpath definitions)
* Look for dependencies in <classpath>, <path>, <pathelement>, and <ivy:dependency> elements`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
    hasComplexSchema: false,
  },
  npm: {
    contentDesc: "npm package.json or lock file",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A comprehensive list of dependencies - for each dependency extract:
  - name (package name)
  - version (semver version, remove ^ and ~ prefixes)
  - scope (dependencies = 'compile', devDependencies = 'test', peerDependencies = 'provided')
* Extract from both dependencies and devDependencies sections`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
    hasComplexSchema: false,
  },
  "dotnet-proj": {
    contentDesc: ".NET project file (.csproj, .vbproj, .fsproj)",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A comprehensive list of PackageReference dependencies - for each dependency extract:
  - name (package name from Include attribute)
  - version (Version attribute value)
  - scope (compile for regular, test if in test project based on SDK type)
* Look for <PackageReference> elements in modern SDK-style projects`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
    hasComplexSchema: false,
  },
  nuget: {
    contentDesc: "NuGet packages.config file (legacy .NET)",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A comprehensive list of package dependencies - for each package extract:
  - name (id attribute)
  - version (version attribute)
  - scope (compile, or test if targetFramework suggests test package)
* Parse all <package> elements in the configuration`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
    hasComplexSchema: false,
  },
  "ruby-bundler": {
    contentDesc: "Ruby Gemfile or Gemfile.lock",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A comprehensive list of gem dependencies - for each gem extract:
  - name (gem name)
  - version (specified version or version from Gemfile.lock, remove ~> and >= prefixes)
  - scope (default is 'compile', :development = 'test', :test = 'test')
  - groupId (use 'rubygems' as a standard groupId)
* Parse gem declarations including version constraints`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
    hasComplexSchema: false,
  },
  "python-pip": {
    contentDesc: "Python requirements.txt or Pipfile",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A comprehensive list of package dependencies - for each package extract:
  - name (package name before == or >= or ~=)
  - version (version specifier, remove operators like ==, >=, ~=)
  - scope (default is 'compile', dev dependencies in Pipfile have scope 'test')
  - groupId (use 'pypi' as standard groupId)
* Handle various version specifiers: ==, >=, <=, ~=, and ranges`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
    hasComplexSchema: false,
  },
  "python-setup": {
    contentDesc: "Python setup.py file",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A comprehensive list of dependencies from install_requires - for each package extract:
  - name (package name)
  - version (version from string, remove operators)
  - scope ('compile' for install_requires, 'test' for tests_require or extras_require['test'])
  - groupId (use 'pypi' as standard groupId)`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
    hasComplexSchema: false,
  },
  "python-poetry": {
    contentDesc: "Python pyproject.toml (Poetry)",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A comprehensive list of dependencies from [tool.poetry.dependencies] - for each dependency extract:
  - name (dependency key name)
  - version (version constraint, remove ^ and ~ prefixes)
  - scope ('compile' for dependencies, 'test' for dev-dependencies)
  - groupId (use 'pypi' as standard groupId)`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      dependencies: true,
    }),
    hasComplexSchema: false,
  },
  "shell-script": {
    contentDesc: "Shell script (bash/sh)",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A list of scheduled jobs or batch processes defined in this script - for each job extract:
  - jobName: The name of the job or script (from filename or comments)
  - trigger: How/when the job is triggered - look for cron syntax (e.g., '0 2 * * *'), systemd timer references, 'at' commands, or indicate 'manual' if run manually, or 'event-driven' if triggered by file system events (inotify, fswatch)
  - purpose: Detailed description of what the job/script does
  - inputResources: Array of input files, directories, databases, or APIs that this script reads from (look for file paths in cat, grep, awk, database connections, curl/wget calls)
  - outputResources: Array of output files, directories, databases, or APIs that this script writes to (look for redirects >, >>, tee, database writes, POST requests)
  - dependencies: Array of other scripts or jobs this depends on (look for source, ., or calls to other scripts)
  - estimatedDuration: Expected runtime if mentioned in comments or obvious from operations
* Look for cron expressions in comments like '# Cron: 0 2 * * *' or systemd timer references
* Identify database operations (mysql, psql, mongo commands)
* Note any external API calls (curl, wget)`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
    }),
    hasComplexSchema: false,
  },
  "batch-script": {
    contentDesc: "Windows batch script (.bat/.cmd)",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A list of scheduled jobs or batch processes defined in this script - for each job extract:
  - jobName: The name of the job or script (from filename or REM comments)
  - trigger: How/when triggered - look for Task Scheduler references, indicate 'scheduled' if mentioned, otherwise 'manual'
  - purpose: Detailed description of what the batch job does
  - inputResources: Array of input files, directories, databases, or network resources (look for file paths, database connections, network paths \\\\server\\share)
  - outputResources: Array of output files, directories, databases written to (look for redirects >, >>, file operations)
  - dependencies: Array of other batch files or scripts this calls (look for CALL, START commands)
  - estimatedDuration: Expected runtime if mentioned in comments
* Look for Windows Task Scheduler references (schtasks, AT commands)
* Identify database operations (sqlcmd, osql, BCP)
* Note network operations (NET USE, COPY to UNC paths)
* Identify service operations (NET START, SC commands)`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
    }),
    hasComplexSchema: false,
  },
  jcl: {
    contentDesc: "Mainframe JCL (Job Control Language)",
    instructions: `* ${COMMON_INSTRUCTIONS.PURPOSE}
* ${COMMON_INSTRUCTIONS.IMPLEMENTATION}
* A list of scheduled jobs or batch processes defined in this JCL - for each job extract:
  - jobName: The job name from the JOB card
  - trigger: Indicate 'scheduled' for batch jobs, look for comments about scheduling (e.g., 'Daily at 02:00')
  - purpose: Detailed description of what the job does based on job steps and programs called
  - inputResources: Array of input datasets from DD statements (look for DD names with DSN=)
  - outputResources: Array of output datasets from DD statements (look for DD names with DSN= and DISP=(NEW or MOD))
  - dependencies: Array of other jobs or datasets this job depends on (look for comments or COND parameters)
  - estimatedDuration: Expected runtime if mentioned in comments
* Extract all EXEC statements to identify programs/procedures called
* Identify DD statements for file I/O
* Note COND parameters that indicate job dependencies
* Look for SORT, IEBGENER, or custom program calls`,
    schema: sourceSummarySchema.pick({
      purpose: true,
      implementation: true,
      scheduledJobs: true,
    }),
    hasComplexSchema: false,
  },
} as const;
