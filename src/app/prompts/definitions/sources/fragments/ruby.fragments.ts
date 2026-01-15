import { createDbMechanismInstructions } from "../../../utils/instruction-utils";
import type { LanguageSpecificFragments } from "../sources.fragments";

/**
 * Ruby-specific instruction fragments.
 * @satisfies {LanguageSpecificFragments}
 */
export const RUBY_SPECIFIC_FRAGMENTS: LanguageSpecificFragments = {
  INTERNAL_REFS:
    "A list of the internal references to other Ruby source files in the same project that this file depends on (only include paths required via require or require_relative that clearly belong to this same application; exclude Ruby standard library and external gem dependencies)",
  EXTERNAL_REFS:
    "A list of the external references to gem / third-party libraries it depends on (as required via require / require_relative) that are NOT part of this application's own code (exclude Ruby standard library modules)",
  PUBLIC_CONSTANTS:
    "A list of public (non-internal) constants it defines (if any) – for each constant include its name, value (redact secrets), and a short type/role description",
  PUBLIC_FUNCTIONS:
    "A list of its public functions/methods (if any) – for each function/method include: name, purpose (in detail), its parameters (with names), what it returns (describe the value; Ruby is dynamically typed so describe the shape / meaning), and a very detailed description of how it is implemented / key logic / important guards or conditionals",
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
};
