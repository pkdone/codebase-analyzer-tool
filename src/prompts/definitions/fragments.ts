/**
 * Common instruction fragments used across multiple app summary templates
 */
export const APP_SUMMARY_PROMPT_FRAGMENTS = {
  DETAILED_DESCRIPTION: "a detailed description of the application's purpose and implementation",
  CONCISE_LIST: "a concise list",
  COMPREHENSIVE_LIST: "a comprehensive list",
  COMPREHENSIVE_ANALYSIS: "a comprehensive analysis",
  AGGREGATED_METRICS:
    "aggregated code quality metrics including complexity analysis, code smell detection, and maintainability indicators to help prioritize refactoring efforts",
  DEPENDENCY_MATRIX:
    "a dependency matrix showing coupling relationships between modules to identify highly coupled components (candidates for single services) and loosely coupled components (candidates for easy separation)",
} as const;

/**
 * Base instruction for database mechanism mapping.
 * This is the common prefix used across all language-specific DB mechanism mappings.
 */
const BASE_DB_MECHANISM_PREFIX =
  `    - mechanism: If any of the following are true (apart from 'NONE'), you MUST assume database interaction:` as const;

/**
 * Base suffix for database mechanism mapping.
 * This is the common ending used across all language-specific DB mechanism mappings.
 */
const BASE_DB_MECHANISM_SUFFIX =
  `      - Otherwise, if the code does not use a database => mechanism: 'NONE'` as const;

/**
 * Creates database mechanism mapping instructions by combining the base prefix,
 * language-specific examples, and the base suffix.
 *
 * @param examples - Array of language-specific database mechanism examples
 * @param additionalNote - Optional additional note to append (e.g., Java's JMS/JNDI note)
 * @returns A formatted string with the complete DB mechanism mapping instructions
 */
function createDbMechanismInstructions(
  examples: readonly string[],
  additionalNote?: string,
): string {
  const parts = [BASE_DB_MECHANISM_PREFIX, ...examples, BASE_DB_MECHANISM_SUFFIX];
  if (additionalNote) {
    parts.push(additionalNote);
  }
  return parts.join("\n");
}

/**
 * Common instruction fragments used across multiple sources templates
 */
export const SOURCES_PROMPT_FRAGMENTS = {
  COMMON: {
    PURPOSE: "A detailed definition of its purpose",
    IMPLEMENTATION: "A detailed definition of its implementation",
    DB_IN_DOCUMENTATION:
      "Look for database schemas, queries, or data models mentioned in the documentation",
    DB_IN_FILE: "Look for database operations, queries, or connections in the file",
  },

  CODE_QUALITY: {
    INTRO: "Code Quality Analysis (REQUIRED for all code files and for all public methods)",
    METHOD_METRICS: `For each public method/function you identify, you MUST estimate and provide:
  * cyclomaticComplexity: Estimate the cyclomatic complexity by counting decision points (if, else, for, while, case, catch, &&, ||, ?:). A simple method with no branches = 1. Add 1 for each decision point.
  * linesOfCode: Count actual lines of code (exclude blank lines and comments)
  * codeSmells: Identify any of these common code smells present. Allowed labels:`,
    METHOD_SMELLS: `    - 'LONG METHOD' - method has > 50 lines of code
    - 'LONG PARAMETER LIST' - method has > 5 parameters
    - 'COMPLEX CONDITIONAL' - deeply nested if/else or complex boolean expressions
    - 'DUPLICATE CODE' - similar logic repeated in multiple places
    - 'MAGIC NUMBERS' - hardcoded numeric values without explanation
    - 'DEEP NESTING' - more than 3-4 levels of nesting
    - 'DEAD CODE' - unreachable or commented-out code
    - 'OTHER' - some other method-level smell`,
    FILE_METRICS: `For file-level codeQualityMetrics, provide:
  * totalMethods: Count of all methods in the file
  * averageComplexity: Average of all method complexities
  * maxComplexity: Highest complexity score in the file
  * averageMethodLength: Average lines of code per method
  * fileSmells: File-level smells. Allowed labels:
    - 'GOD CLASS' - class has > 20 methods or > 500 lines of code
    - 'TOO MANY METHODS' - class has > 20 public methods
    - 'FEATURE ENVY' - methods heavily use data from other classes
    - 'DATA CLASS' - class only contains fields and getters/setters
    - 'LARGE FILE' - class file exceeds 500 lines of code
    - 'OTHER' - some other file-level smell`,
  },

  DB_INTEGRATION: {
    INTRO: "Database Integration Analysis (REQUIRED for source files that interact with databases)",
    REQUIRED_FIELDS: `For files that interact with a database, you MUST extract and provide ALL of the following fields in the databaseIntegration object. DO NOT omit any field - if you cannot determine a value, use "unknown" or indicate "not identifiable from code":
  * REQUIRED FIELDS:
    - mechanism (REQUIRED): The integration type - see mechanism mapping below (use "NONE" if no database integration)
    - description (REQUIRED): Detailed explanation of how database integration is achieved (use "n/a" if no database integration)
    - codeExample (REQUIRED): A small redacted code snippet showing the database interaction  (use "n/a" if no database integration)
  * STRONGLY RECOMMENDED FIELDS (provide whenever possible, using "n/a" if no database integration):
    - name: Name of the database service or data access component (e.g., "UserRepository", "OrderDAO", "DatabaseConfig")
    - databaseName: Specific database/schema name being accessed (look in connection strings, config files, or annotations)
    - tablesAccessed: Array of table/collection/entity names accessed (from SQL queries, JPA entity names, @Table annotations, repository interfaces)
    - operationType: Array of operation types (EXACT enumeration values only): READ, WRITE, READ_WRITE, DDL, ADMIN, OTHER. Use READ_WRITE instead of separate READ and WRITE entries.
    - queryPatterns: Description of query complexity (e.g., 'simple CRUD', 'complex joins with subqueries', 'aggregations', 'stored procedure calls', 'batch operations')
    - transactionHandling: How transactions are managed (e.g., 'Spring @Transactional', 'manual tx.commit()', 'JPA EntityTransaction', 'auto-commit', 'none', 'unknown')
    - protocol: Database type and version (e.g., 'PostgreSQL 15', 'MySQL 8.0', 'MongoDB 6.0', 'Oracle 19c', 'H2', 'SQL Server 2019')
    - connectionInfo: JDBC URL or connection string - MUST REDACT passwords/secrets (e.g., 'jdbc:postgresql://localhost:5432/mydb', 'mongodb://localhost:27017/appdb')`,
  },

  INTEGRATION_POINTS: {
    INTRO:
      "A list of integration points this file defines or consumes – for each integration include: mechanism type, name, description, and relevant details. Look for:",
  },

  SCHEDULED_JOBS: {
    INTRO:
      "A list of scheduled jobs or batch processes defined in this file – for each job extract:",
    FIELDS: ` * jobName: The name of the job (from filename or job card/comments)
  * trigger: How/when the job is triggered (cron, scheduled, manual, event-driven)
  * purpose: Detailed description of what it does
  * inputResources: Array of inputs (files, datasets, DBs, APIs)
  * outputResources: Array of outputs (files, datasets, DBs, APIs)
  * dependencies: Array of other jobs/scripts/resources it depends on
  * - estimatedDuration: Expected runtime if mentioned`,
  },

  JAVA_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to the classpaths of other classes and interfaces belonging to the same application referenced by the code of this class/interface (do not include standard Java SE, Java EE 'javax.*' classes or 3rd party library classes in the list of internal references)",
    EXTERNAL_REFS:
      "A list of the external references to third-party classpath used by this source file, which do not belong to this same application that this class/interface file is part of",
    PUBLIC_METHODS:
      "A list of its public methods (if any) - for each public method, include the method's name, its purpose in detail, a list of its parameters, its return type and a very detailed description of its implementation",
    PUBLIC_CONSTANTS: "A list of public constants (name, value and type) it defines (if any)",
    INTEGRATION_INSTRUCTIONS: `  * REST APIs (mechanism: 'REST'):
    - JAX-RS annotations (@Path, @GET, @POST, @PUT, @DELETE, @PATCH) - include path, method, request/response body
    - Spring annotations (@RestController, @RequestMapping, @GetMapping, @PostMapping, @PutMapping, @DeleteMapping, @PatchMapping)
    - Servlet mappings (web.xml or @WebServlet) - include URL patterns
    - HTTP client calls (RestTemplate, WebClient, HttpClient, OkHttp, Feign @FeignClient)
  * SOAP Services (mechanism: 'SOAP'):
    - JAX-WS annotations (@WebService, @WebMethod, @SOAPBinding) - include service name, operation name, SOAP version
    - WSDL references or Apache CXF service definitions
    - SOAPConnectionFactory, SOAPMessage usage
    - SOAP client proxy usage (Service.create, getPort)
   * JMS Messaging (mechanism: 'JMS-QUEUE' or 'JMS-TOPIC'):
    - Queue operations: MessageProducer sending to Queue, QueueSender, @JmsListener with destination type QUEUE
    - Topic operations: TopicPublisher, @JmsListener with destination type TOPIC
    - Include queue/topic name, message type, direction (PRODUCER/CONSUMER/BOTH/BIDIRECTIONAL)
    - ConnectionFactory, Session, MessageProducer/MessageConsumer patterns
  * Kafka (mechanism: 'KAFKA-TOPIC'):
    - KafkaProducer, KafkaConsumer usage - include topic name, message type, direction (PRODUCER/CONSUMER/BOTH/BIDIRECTIONAL)
    - @KafkaListener annotations - include topic names, consumer group
  * RabbitMQ (mechanism: 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'):
    - RabbitTemplate send/receive operations - include queue/exchange name and direction (PRODUCER/CONSUMER/BOTH/BIDIRECTIONAL if inferable)
    - @RabbitListener annotations - include queue names, direction
  * Other Messaging:
    - ActiveMQ: @JmsListener with ActiveMQ-specific config => 'ACTIVEMQ-QUEUE' or 'ACTIVEMQ-TOPIC'
    - AWS SQS/SNS: AmazonSQS client, sendMessage, receiveMessage => 'AWS-SQS' or 'AWS-SNS'
    - Azure Service Bus: ServiceBusClient, QueueClient, TopicClient => 'AZURE-SERVICE-BUS-QUEUE' or 'AZURE-SERVICE-BUS-TOPIC'
  * WebSockets (mechanism: 'WEBSOCKET'):
    - @ServerEndpoint annotations - include endpoint path
    - WebSocketHandler implementations
  * gRPC (mechanism: 'GRPC'):
    - @GrpcService annotations or gRPC stub usage - include service name, methods`,
    DB_MECHANISM_MAPPING: createDbMechanismInstructions(
      [
        "      - Uses JDBC driver / JDBC API classes => mechanism: 'JDBC'",
        "      - Uses Spring Data repositories (CrudRepository, JpaRepository, MongoRepository, etc.) => mechanism: 'SPRING-DATA'",
        "      - Uses Hibernate API directly (SessionFactory, Session, Criteria API) => mechanism: 'HIBERNATE'",
        "      - Uses standard JPA annotations and EntityManager (without Spring Data) => mechanism: 'JPA'",
        "      - Uses Enterprise Java Beans for persistence (CMP/BMP, @Entity with EJB) => mechanism: 'EJB'",
        "      - Contains inline SQL strings / queries (SELECT / UPDATE / etc.) without ORM => mechanism: 'SQL'",
        "      - Uses raw database driver APIs (DataSource, Connection, etc.) without higher abstraction => mechanism: 'DRIVER'",
        "      - Uses other JPA-based ORMs (TopLink, EclipseLink) not clearly Hibernate => mechanism: 'ORM'",
        "      - Defines DDL / migration style schema changes inline => mechanism: 'DDL'",
        "      - Executes DML specific batch / manipulation blocks distinct from generic SQL => mechanism: 'DML'",
        "      - Invokes stored procedures (CallableStatement, @Procedure, etc.) => mechanism: 'STORED-PROCEDURE'",
        "      - Creates or manages database triggers => mechanism: 'TRIGGER'",
        "      - Creates or invokes database functions => mechanism: 'FUNCTION'",
        "      - Uses Redis client (Jedis, Lettuce) => mechanism: 'REDIS'",
        "      - Uses Elasticsearch client (RestHighLevelClient, ElasticsearchTemplate) => mechanism: 'ELASTICSEARCH'",
        "      - Uses Cassandra CQL (CqlSession, @Query with CQL) => mechanism: 'CASSANDRA-CQL'",
        "      - Uses a 3rd party framework not otherwise categorized => mechanism: 'OTHER'",
      ],
      "    (note, JMS and JNDI are not related to interacting with a database)",
    ),
  },

  JAVASCRIPT_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to other modules used by this source file (by using `require` or `import` keywords) belonging to the same application referenced by the code in this source file (do not include external or 3rd party modules/libraries in the list of internal references)",
    EXTERNAL_REFS:
      "A list of the external references to other external modules/libraries used by this source file (by using `require` or `import` keywords), which do not belong to this same application that this source file is part of",
    PUBLIC_CONSTANTS:
      "A list of any exported constants or configuration values defined in this file",
    PUBLIC_METHODS: "A list of any exported functions or procedures defined in this file",
    INTEGRATION_INSTRUCTIONS: `  * REST APIs (mechanism: 'REST'):
    - Express route definitions (app.get, app.post, app.put, app.delete, router.use)
    - Fastify route definitions (fastify.get, fastify.post, etc.)
    - Koa route definitions (router.get, router.post, etc.)
    - NestJS decorators (@Get, @Post, @Put, @Delete, @Patch, @Controller)
    - HTTP client calls (fetch, axios, request, superagent, got)
  * GraphQL (mechanism: 'GRAPHQL'):
    - Schema definitions (type Query, type Mutation, resolvers)
    - Apollo Server or GraphQL Yoga setup
    - GraphQL client usage (Apollo Client, urql)
  * tRPC (mechanism: 'TRPC'):
    - Procedure definitions (publicProcedure, protectedProcedure)
    - Router definitions
  * WebSockets (mechanism: 'WEBSOCKET'):
    - Socket.io usage (io.on, socket.emit)
    - ws library (WebSocket server/client)
    - WebSocket API usage
  * Messaging Systems:
    - RabbitMQ (amqplib): Channel.sendToQueue, consume => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
    - Kafka (kafkajs): producer.send, consumer.subscribe => 'KAFKA-TOPIC'
    - AWS SQS/SNS (aws-sdk): sendMessage, subscribe => 'AWS-SQS' or 'AWS-SNS'
    - Redis Pub/Sub: publish, subscribe => 'REDIS-PUBSUB'
  * gRPC (mechanism: 'GRPC'):
    - @grpc/grpc-js usage, service definitions
  * Server-Sent Events (mechanism: 'SSE'):
    - res.writeHead with text/event-stream`,
    DB_MECHANISM_MAPPING: createDbMechanismInstructions([
      "      - Uses Mongoose schemas/models (mongoose.model, Schema) => mechanism: 'MONGOOSE'",
      "      - Uses Prisma Client (PrismaClient, prisma.user.findMany) => mechanism: 'PRISMA'",
      "      - Uses TypeORM (Repository, EntityManager, @Entity decorators) => mechanism: 'TYPEORM'",
      "      - Uses Sequelize models (sequelize.define, Model.findAll) => mechanism: 'SEQUELIZE'",
      "      - Uses Knex query builder (knex.select, knex('table')) => mechanism: 'KNEX'",
      "      - Uses Drizzle ORM (drizzle, select, insert) => mechanism: 'DRIZZLE'",
      "      - Uses Redis client (redis.set, redis.get, ioredis) => mechanism: 'REDIS'",
      "      - Uses Elasticsearch client (@elastic/elasticsearch, client.search) => mechanism: 'ELASTICSEARCH'",
      "      - Uses Cassandra driver (cassandra-driver, client.execute with CQL) => mechanism: 'CASSANDRA-CQL'",
      "      - Uses MongoDB driver directly (MongoClient, db.collection) without Mongoose => mechanism: 'MQL'",
      "      - Contains raw SQL strings without ORM => mechanism: 'SQL'",
      "      - Uses generic database driver (pg, mysql2, tedious) without ORM => mechanism: 'DRIVER'",
      "      - Defines DDL / migration scripts => mechanism: 'DDL'",
      "      - Performs data manipulation (bulk operations, seeding) => mechanism: 'DML'",
    ]),
  },

  CSHARP_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to other application classes - fully qualified type names (only include 'using' directives that clearly belong to this same application's code – exclude BCL / System.* and third-party packages)",
    EXTERNAL_REFS:
      "A list of the external references to 3rd party / NuGet package classes (Fully qualified type names) it depends on (exclude System.* where possible)",
    PUBLIC_CONSTANTS:
      "A list of public constants / readonly static fields (if any) – include name, value (redact secrets), and a short type/role description",
    PUBLIC_METHODS:
      "A list of its public methods (if any) – for each method list: name, purpose (detailed), parameters (name and type), return type, async/sync indicator, and a very detailed implementation description highlighting notable control flow, LINQ queries, awaits, exception handling, and important business logic decisions",
    KIND_OVERRIDE: "Its kind ('class', 'interface', 'record', or 'struct')",
    INTEGRATION_INSTRUCTIONS: `  * REST APIs (mechanism: 'REST'):
    - ASP.NET Core MVC/Web API controller actions with [HttpGet], [HttpPost], [HttpPut], [HttpDelete], [HttpPatch], [Route]
    - ASP.NET Core Minimal API endpoints (MapGet, MapPost, MapPut, MapDelete)
    - HTTP client calls (HttpClient, RestSharp, Refit interfaces)
  * WCF/SOAP Services (mechanism: 'SOAP'):
    - WCF service contracts ([ServiceContract], [OperationContract])
    - SOAP service references, WCF client proxies
    - BasicHttpBinding, WSHttpBinding configurations
  * Messaging Systems:
    - Azure Service Bus (ServiceBusClient, QueueClient for queues, TopicClient for topics) => 'AZURE-SERVICE-BUS-QUEUE' or 'AZURE-SERVICE-BUS-TOPIC'
    - RabbitMQ.Client usage (IModel.BasicPublish, BasicConsume) => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
    - MSMQ (MessageQueue class) => 'OTHER' (specify MSMQ in description and protocol)
    - AWS SQS/SNS (AWSSDK) => 'AWS-SQS' or 'AWS-SNS'
  * gRPC (mechanism: 'GRPC'):
    - Grpc.Net.Client, Grpc.Core service definitions
   - gRPC client stubs and service implementations`,
    DB_MECHANISM_MAPPING: createDbMechanismInstructions([
      "      - Uses Entity Framework / EF Core (DbContext, LINQ-to-Entities, DbSet) => mechanism: 'EF-CORE'",
      "      - Uses Dapper extension methods (Query<T>, Execute, QueryAsync) => mechanism: 'DAPPER'",
      "      - Uses other micro ORMs (NPoco, ServiceStack.OrmLite, PetaPoco) => mechanism: 'MICRO-ORM'",
      "      - Uses ADO.NET primitives (SqlConnection, SqlCommand, DataReader) without ORM => mechanism: 'ADO-NET'",
      "      - Executes raw SQL strings or stored procedures via SqlCommand => mechanism: 'SQL'",
      "      - Invokes stored procedures explicitly (CommandType.StoredProcedure) => mechanism: 'STORED-PROCEDURE'",
      "      - Uses database provider drivers directly (NpgsqlConnection, MySqlConnection) without abstraction => mechanism: 'DRIVER'",
      "      - Contains EF Core migrations or explicit DDL (CREATE/ALTER/DROP TABLE) => mechanism: 'DDL'",
      "      - Performs data manipulation operations (bulk INSERT, SqlBulkCopy) => mechanism: 'DML'",
      "      - Creates or invokes database functions => mechanism: 'FUNCTION'",
      "      - Uses Redis client (StackExchange.Redis) => mechanism: 'REDIS'",
      "      - Uses Elasticsearch.Net client => mechanism: 'ELASTICSEARCH'",
    ]),
  },

  PYTHON_SPECIFIC: {
    INTERNAL_REFS:
      "A list of internal references (imports that belong to this same project; exclude Python stdlib & third‑party packages)",
    EXTERNAL_REFS:
      "A list of external references (third‑party libraries imported; exclude stdlib modules like sys, os, json, typing, pathlib, re, math, datetime, logging, asyncio, dataclasses, functools, itertools)",
    PUBLIC_CONSTANTS:
      "A list of public constants (UPPERCASE module-level assignments; include name, redacted value, brief type/role)",
    PUBLIC_METHODS:
      "A list of its public functions/methods – for each include: name, purpose (detailed), parameters (name + type hint or inferred type; if no hint, describe expected type), returnType (type hint or inferred description of returned value shape), implementation (very detailed explanation of logic, branches, important data transformations, exception handling), cyclomaticComplexity (see rules), linesOfCode (exclude blank lines & comments), codeSmells (if any; use EXACT enum labels)",
    KIND_OVERRIDE:
      "Its kind ('class', 'module', 'function', or 'package'; choose the dominant one)",
    INTEGRATION_INSTRUCTIONS: `  * REST APIs (mechanism: 'REST'):
    - Flask @app.route decorators (path, methods)
    - FastAPI endpoint decorators (@app.get/post/put/delete/patch)
    - Django REST Framework views / viewsets (method names, URL pattern if inferable)
    - aiohttp route registrations
    - HTTP client calls (requests/httpx/aiohttp ClientSession)
  * GraphQL (mechanism: 'GRAPHQL'): Graphene / Strawberry schema & resolver definitions
  * gRPC (mechanism: 'GRPC'): grpc.* Servicer classes, stub usage
  * Messaging: Celery tasks (@app.task) => mechanism 'OTHER' (specify Celery); RabbitMQ (pika), Kafka (producer/consumer), Redis Pub/Sub (redis.publish/subscribe), AWS SQS/SNS (boto3)
  * WebSockets (mechanism: 'WEBSOCKET'): FastAPI WebSocket endpoints, Django Channels consumers
  * Server-Sent Events (mechanism: 'SSE'): streaming responses with 'text/event-stream'`,
    DB_MECHANISM_MAPPING: createDbMechanismInstructions([
      "      - SQLAlchemy ORM (Session, declarative Base) => 'SQLALCHEMY'",
      "      - Django ORM (models.Model, QuerySet) => 'DJANGO-ORM'",
      "      - Raw DB-API / driver (psycopg2, mysqlclient, sqlite3) => 'DRIVER' or 'SQL' (if many inline SQL strings)",
      "      - Async drivers (asyncpg, aiomysql) => 'DRIVER'",
      "      - Inline CREATE/ALTER => also 'DDL'",
      "      - Bulk data scripts => also 'DML'",
      "      - Stored procedure/function invocation (CALL/EXEC) => 'STORED-PROCEDURE' or 'FUNCTION'",
    ]),
    PYTHON_COMPLEXITY_METRICS: `Cyclomatic complexity (Python):
- Start at 1; +1 for each if / elif / for / while / except / finally / with (when it controls resource flow) / comprehension 'for' / ternary / logical operator (and/or) in a condition / match case arm
- +1 for each additional 'if' inside a comprehension
For each public function/method capture: cyclomaticComplexity, linesOfCode, and codeSmells
File-level metrics: totalMethods, averageComplexity, maxComplexity, averageMethodLength, fileSmells (e.g. 'LARGE FILE', 'TOO MANY METHODS', 'GOD CLASS', 'FEATURE ENVY')`,
  },

  RUBY_SPECIFIC: {
    INTERNAL_REFS:
      "A list of the internal references to other Ruby source files in the same project that this file depends on (only include paths required via require or require_relative that clearly belong to this same application; exclude Ruby standard library and external gem dependencies)",
    EXTERNAL_REFS:
      "A list of the external references to gem / third-party libraries it depends on (as required via require / require_relative) that are NOT part of this application's own code (exclude Ruby standard library modules)",
    PUBLIC_CONSTANTS:
      "A list of public (non-internal) constants it defines (if any) – for each constant include its name, value (redact secrets), and a short type/role description",
    PUBLIC_METHODS:
      "A list of its public methods (if any) – for each method include: name, purpose (in detail), its parameters (with names), what it returns (describe the value; Ruby is dynamically typed so describe the shape / meaning), and a very detailed description of how it is implemented / key logic / important guards or conditionals",
    KIND_OVERRIDE: "Its kind ('class', 'module', or 'enum')",
    INTEGRATION_INSTRUCTIONS: `  * REST APIs (mechanism: 'REST'):
    - Rails controller actions (routes.rb get/post/put/delete/patch, controller action methods)
    - Sinatra route definitions (get, post, put, delete, patch blocks)
    - Grape API endpoints (get, post, put, delete, patch declarations)
    - HTTP client calls (Net::HTTP, RestClient, HTTParty, Faraday)
  * GraphQL (mechanism: 'GRAPHQL'):
    - GraphQL type definitions (GraphQL::ObjectType, field definitions)
    - GraphQL mutations and queries
  * SOAP (mechanism: 'SOAP'):
    - Savon SOAP client usage
    - SOAP service definitions
  * Messaging Systems:
    - RabbitMQ (bunny gem): channel.queue, publish => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
    - Redis Pub/Sub: redis.publish, subscribe => 'REDIS-PUBSUB'
    - AWS SQS/SNS (aws-sdk) => 'AWS-SQS' or 'AWS-SNS'
  * WebSockets (mechanism: 'WEBSOCKET'):
    - Action Cable channels
    - WebSocket-Rails usage`,
    DB_MECHANISM_MAPPING: createDbMechanismInstructions([
      "      - Uses ActiveRecord (models, migrations, associations, where/find methods) => mechanism: 'ACTIVE-RECORD'",
      "      - Uses Sequel ORM (DB[:table], dataset operations) => mechanism: 'SEQUEL'",
      "      - Uses other Ruby ORM / micro ORM (ROM.rb, DataMapper) => mechanism: 'ORM' (or 'MICRO-ORM' if lightweight)",
      "      - Uses Redis client (redis-rb, redis.set/get) => mechanism: 'REDIS'",
      "      - Executes raw SQL strings (SELECT / INSERT / etc.) => mechanism: 'SQL'",
      "      - Invokes stored procedures (via connection.exec with CALL) => mechanism: 'STORED-PROCEDURE'",
      "      - Uses database driver / adapter directly (PG gem, mysql2 gem) without ORM => mechanism: 'DRIVER'",
      "      - Defines migration DSL (create_table, add_column, change_table) => mechanism: 'DDL'",
      "      - Performs data manipulation (bulk insert helpers, seeding, data-only scripts) => mechanism: 'DML'",
      "      - Creates or manages triggers (via execute or DSL) => mechanism: 'TRIGGER'",
      "      - Creates or invokes functions / stored routines => mechanism: 'FUNCTION'",
    ]),
  },

  SQL_SPECIFIC: {
    TABLE_LIST:
      "A list of the tables (if any) it defines - for each table, include the names of the table's fields, if known",
    STORED_PROCEDURE_LIST:
      "A list of the stored procedure (if any) it defines - for each stored procedure, include the stored procedure's name, its purpose, the number of lines of code in the stored procedure, and a complexity score or how complex the stored procedure's code is (the score must be have one of the following values: 'LOW', 'MEDIUM', 'HIGH') along with a short reason for the chosen complexity score",
    TRIGGER_LIST:
      "A list of the triggers (if any) it defines - for each trigger, include the trigger's name, its purpose, the number of lines of code in the trigger, and a complexity score or how complex the trigger's code is (the score must be have one of the following values: 'LOW', 'MEDIUM', 'HIGH') along with a short reason for the chosen complexity score",
    DB_INTEGRATION_ANALYSIS: `Database Integration Analysis (REQUIRED) - Extract ALL possible database details:
IMPORTANT: databaseIntegration must be a SINGLE OBJECT (not an array). If multiple integration mechanisms exist in the file (e.g., both STORED-PROCEDURE and DDL), combine them into one object:
  - mechanism: Use the primary mechanism (or combine related mechanisms in the description)
  - description: Include details about ALL integration mechanisms present
  - codeExample: Include examples from all relevant mechanisms
  - tablesAccessed: Merge all tables accessed across all mechanisms
  - operationType: Merge all operation types across mechanisms

REQUIRED: mechanism (must be 'NONE', 'DDL', 'DML', 'SQL', 'STORED-PROCEDURE', or 'TRIGGER'), description (detailed explanation covering all mechanisms if multiple exist), codeExample (max 6 lines, can include examples from multiple mechanisms)
STRONGLY RECOMMENDED (extract whenever possible): databaseName (specific database/schema name if mentioned), tablesAccessed (array of table names from queries or DDL), operationType (array: ['READ'], ['WRITE'], ['READ', 'WRITE'], ['DDL'], ['ADMIN']), queryPatterns (e.g., 'CREATE TABLE statements', 'INSERT/UPDATE operations', 'complex joins', 'stored procedures'), transactionHandling (e.g., 'explicit BEGIN/COMMIT', 'auto-commit', 'none'), protocol (database type and version if identifiable, e.g., 'PostgreSQL 14', 'MySQL 8.0', 'SQL Server 2019', 'Oracle 19c'), connectionInfo ('not applicable for SQL files' or specific connection details if present)`,
  },

  XML_SPECIFIC: {
    UI_FRAMEWORK_DETECTION: `UI Frameworks Detection (REQUIRED for web application config files)
If this XML file is a web application configuration file, you MUST analyze and identify the UI framework:
  * Struts Framework Detection:
    - Look for <servlet-class> containing "org.apache.struts.action.ActionServlet" or "StrutsPrepareAndExecuteFilter"
    - Check for <servlet-name> with "action" or "struts"
    - Look for DOCTYPE or root element referencing struts-config
    - Extract version from DTD/XSD if available (e.g., "struts-config_1_3.dtd" => version "1.3")
    - If detected, provide: { name: "Struts", version: "X.X" (if found), configFile: <current file path> }
  * JSF (JavaServer Faces) Framework Detection:
    - Look for <servlet-class> containing "javax.faces.webapp.FacesServlet" or "jakarta.faces.webapp.FacesServlet"
    - Check for root element <faces-config> in faces-config.xml
    - Extract version from namespace (e.g., "http://xmlns.jcp.org/xml/ns/javaee" with version="2.2")
    - If detected, provide: { name: "JSF", version: "X.X" (if found), configFile: <current file path> }
  *Spring MVC Framework Detection:
    - Look for <servlet-class> containing "org.springframework.web.servlet.DispatcherServlet"
    - Check for root element containing "http://www.springframework.org/schema/mvc"
    - Look for annotations like @Controller, @RequestMapping in servlet definitions
    - If detected, provide: { name: "Spring MVC", version: <if identifiable>, configFile: <current file path> }
If a UI framework is detected, populate the uiFramework field. Otherwise, omit the field entirely from the JSON response.`,
  },

  JSP_SPECIFIC: {
    DATA_INPUT_FIELDS:
      "A list of data input fields it contains (if any). For each field, provide its name (or an approximate name), its type (e.g., 'text', 'hidden', 'password'), and a detailed description of its purpose",
    JSP_METRICS_ANALYSIS: `JSP Metrics Analysis (REQUIRED for all JSP files)
You MUST analyze and provide the following JSP metrics in the jspMetrics object:
  * scriptletCount (REQUIRED): Count the exact number of Java scriptlets (<% ... %>) in this file
  * expressionCount (REQUIRED): Count the exact number of expressions (<%= ... %>) in this file
  * declarationCount (REQUIRED): Count the exact number of declarations (<%! ... %>) in this file
  * customTags (REQUIRED if any exist): For each <%@ taglib ... %> directive, extract:
    - prefix: The tag library prefix from the taglib directive
    - uri: The URI of the tag library from the taglib directive
   Examples:
    - <%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %> => { prefix: "c", uri: "http://java.sun.com/jsp/jstl/core" }
    - <%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %> => { prefix: "fmt", uri: "http://java.sun.com/jsp/jstl/fmt" }
    - <%@ taglib prefix="custom" uri="/WEB-INF/custom.tld" %> => { prefix: "custom", uri: "/WEB-INF/custom.tld" }
   Note: Do NOT count directive tags (<%@ ... %>) or action tags (<jsp:... />) as scriptlets. Only count code blocks with <% %>, <%= %>, and <%! %>.`,
  },

  SHELL_SCRIPT_SPECIFIC: {
    CRON_EXPRESSIONS:
      "Look for cron expressions in comments like '# Cron: 0 2 * * *' or systemd timer references",
    DATABASE_OPS: "Identify database operations (mysql, psql, mongo commands)",
    EXTERNAL_API_CALLS: "Note any external API calls (curl, wget)",
  },

  BATCH_SCRIPT_SPECIFIC: {
    TASK_SCHEDULER: "Look for Windows Task Scheduler references (schtasks, AT commands)",
    DATABASE_OPS: "Identify database operations (sqlcmd, osql, BCP)",
    NETWORK_OPS: "Note network operations (NET USE, COPY to UNC paths)",
    SERVICE_OPS: "Identify service operations (NET START, SC commands)",
  },

  JCL_SPECIFIC: {
    EXEC_STATEMENTS: "Extract all EXEC statements to identify programs/procedures called",
    DD_STATEMENTS: "Identify DD statements for file I/O",
    COND_PARAMETERS: "Note COND parameters that indicate job dependencies",
    SORT_UTILITIES: "Look for SORT, IEBGENER, or custom program calls",
  },

  DEPENDENCY_EXTRACTION: {
    MAVEN: `A comprehensive list of dependencies declared in this POM file - for each dependency extract:
  * name (artifactId)
  * groupId
  * version (resolve properties if possible, e.g., \${spring.version})
  * scope (compile, test, runtime, provided, import, system)
  * type (jar, war, pom, etc.)
  Note: Extract dependencies from both <dependencies> and <dependencyManagement> sections`,
    GRADLE: `A comprehensive list of dependencies declared - for each dependency extract:
  * name (artifact name after the colon, e.g., for 'org.springframework:spring-core:5.3.9' the name is 'spring-core')
  * groupId (group before the colon, e.g., 'org.springframework')
  * version (version number, or 'latest' if using dynamic versions)
  * scope (implementation, api, testImplementation, runtimeOnly, etc. - map these to standard Maven scopes)
  Handle both Groovy DSL and Kotlin DSL syntax`,
    ANT: `A comprehensive list of dependencies declared - for each dependency extract:
  * name (jar file name or artifact name)
  * groupId (organization or project name if specified)
  * version (extract from jar filename if versioned, e.g., 'commons-lang3-3.12.0.jar' -> version: '3.12.0')
  * scope (compile, test, runtime based on classpath definitions)
  Look for dependencies in <classpath>, <path>, <pathelement>, and <ivy:dependency> elements`,
    NPM: `A comprehensive list of dependencies - for each dependency extract:
  * name (package name)
  * version (semver version, remove ^ and ~ prefixes)
  * scope (dependencies = 'compile', devDependencies = 'test', peerDependencies = 'provided')
  Extract from both dependencies and devDependencies sections`,
    DOTNET: `A comprehensive list of PackageReference dependencies - for each dependency extract:
  * name (package name from Include attribute)
  * version (Version attribute value)
  * scope (compile for regular, test if in test project based on SDK type)
  Look for <PackageReference> elements in modern SDK-style projects`,
    NUGET: `A comprehensive list of package dependencies - for each package extract:
  * name (id attribute)
  * version (version attribute)
  * scope (compile, or test if targetFramework suggests test package)
  Parse all <package> elements in the configuration`,
    RUBY_BUNDLER: `A comprehensive list of gem dependencies - for each gem extract:
  * name (gem name)
  * version (specified version or version from Gemfile.lock, remove ~> and >= prefixes)
  * scope (default is 'compile', :development = 'test', :test = 'test')
  * groupId (use 'rubygems' as a standard groupId)
  Parse gem declarations including version constraints`,
    PYTHON_PIP: `A comprehensive list of package dependencies - for each package extract:
  * name (package name before == or >= or ~=)
  * version (version specifier, remove operators like ==, >=, ~=)
  * scope (default is 'compile', dev dependencies in Pipfile have scope 'test')
  * groupId (use 'pypi' as standard groupId)
  Handle various version specifiers: ==, >=, <=, ~=, and ranges`,
    PYTHON_SETUP: `A comprehensive list of dependencies from install_requires - for each package extract:
  * name (package name)
  * version (version from string, remove operators)
  * scope ('compile' for install_requires, 'test' for tests_require or extras_require['test'])
  * groupId (use 'pypi' as standard groupId)`,
    PYTHON_POETRY: `A comprehensive list of dependencies from [tool.poetry.dependencies] - for each dependency extract:
  * name (dependency key name)
  * version (version constraint, remove ^ and ~ prefixes)
  * scope ('compile' for dependencies, 'test' for dev-dependencies)
  * groupId (use 'pypi' as standard groupId)`,
  },
} as const;

/**
 * Composable instruction sets for common patterns across file types
 */
export const CODE_QUALITY_INSTRUCTIONS = [
  SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.INTRO,
  SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.METHOD_METRICS,
  SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.METHOD_SMELLS,
  SOURCES_PROMPT_FRAGMENTS.CODE_QUALITY.FILE_METRICS,
] as const;

export const DB_INTEGRATION_INSTRUCTIONS = [
  SOURCES_PROMPT_FRAGMENTS.DB_INTEGRATION.INTRO,
  SOURCES_PROMPT_FRAGMENTS.DB_INTEGRATION.REQUIRED_FIELDS,
] as const;

export const INTEGRATION_POINTS_INSTRUCTIONS = [
  SOURCES_PROMPT_FRAGMENTS.INTEGRATION_POINTS.INTRO,
] as const;

export const SCHEDULED_JOBS_INSTRUCTIONS = [
  SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.INTRO,
  SOURCES_PROMPT_FRAGMENTS.SCHEDULED_JOBS.FIELDS,
] as const;

/**
 * Common instruction sets for coding languages with class/interface structures
 * (Java, C#, etc.). Includes name, kind, namespace extraction.
 */
export const CLASS_LANGUAGE_BASE_INSTRUCTIONS = [
  "The name of the main public class/interface of the file",
  "Its kind ('class' or 'interface')",
  "Its namespace (classpath)",
] as const;

/**
 * Common instruction sets for coding languages with module structures
 * (Python, Ruby, etc.). Includes name, kind, namespace extraction.
 */
export const MODULE_LANGUAGE_BASE_INSTRUCTIONS = [
  "The name of the primary public entity of the file (class, module, or main function)",
  "Its kind ('class', 'module', or enum; choose the dominant one)",
  "Its namespace (fully qualified module path)",
] as const;

/**
 * JSON format enforcement instruction used across all prompt templates.
 * This ensures LLM responses are valid, parseable JSON that conforms to strict formatting requirements.
 */
export const FORCE_JSON_FORMAT = `The response MUST be valid JSON and meet the following critical JSON requirements:
- Only include JSON: start directly with { or [, no XML, markdown, explanations, or other text
- All property names must be quoted: use "propertyName": value at ALL nesting levels (both opening and closing quotes required)
- Property name format: every property must follow the exact pattern "propertyName": value - no unquoted names (e.g., use "name": not name:)
- Property names must be followed by a colon: use "propertyName": value, not "propertyName" value or "propertyName" []
- All string values must be quoted: use "value" not unquoted strings
- No markdown formatting: do not use asterisks (*), bullet points (•), or any markdown characters before property names
- No stray text: do not include any text, characters, or lines between or around JSON properties
- Every property must have a name: do not omit property names (e.g., use "purpose": "value" not ": "value")
- Use proper JSON syntax: commas, colons, matching brackets/braces, and escape quotes in strings
- Complete and valid: ensure all property names are complete (no truncation) and JSON is parseable
- Use only exact property names from the schema - do not add extra properties or characters before property names
- No stray prefixes: do not add prefixes like "ar" or other characters before array elements or string values
- ASCII only: use only ASCII characters in string values
- No explanatory text: do not include phrases like "so many methods" or "I will stop here" in the JSON
- Proper commas: ensure commas separate all array elements and object properties
- Escape control characters: any control characters in string values must be properly escaped as \\uXXXX`;
