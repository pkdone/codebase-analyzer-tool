import { createDbMechanismInstructions } from "../utils";
import type { LanguageSpecificFragments } from "../sources.types";
import { MECHANISM_DESCRIPTIONS } from "./common.fragments";

/**
 * JavaScript/TypeScript-specific instruction fragments.
 * @satisfies {LanguageSpecificFragments}
 */
export const JAVASCRIPT_SPECIFIC_FRAGMENTS: LanguageSpecificFragments = {
  INTERNAL_REFS:
    "A list of the internal references to other modules used by this source file (by using `require` or `import` keywords) belonging to the same application referenced by the code in this source file (do not include external or 3rd party modules/libraries in the list of internal references)",
  EXTERNAL_REFS:
    "A list of the external references to other external modules/libraries used by this source file (by using `require` or `import` keywords), which do not belong to this same application that this source file is part of",
  PUBLIC_CONSTANTS: "A list of any exported constants or configuration values defined in this file",
  PUBLIC_FUNCTIONS:
    "A list of its public functions/methods (if any) - for each public function/method, include the function's name, its purpose in detail, a list of its parameters, its return type and a very detailed description of its implementation",
  INTEGRATION_INSTRUCTIONS: `  * REST APIs ${MECHANISM_DESCRIPTIONS.REST}:
    - Express route definitions (app.get, app.post, app.put, app.delete, router.use)
    - Fastify route definitions (fastify.get, fastify.post, etc.)
    - Koa route definitions (router.get, router.post, etc.)
    - NestJS decorators (@Get, @Post, @Put, @Delete, @Patch, @Controller)
    - HTTP client calls (fetch, axios, request, superagent, got)
  * GraphQL ${MECHANISM_DESCRIPTIONS.GRAPHQL}:
    - Schema definitions (type Query, type Mutation, resolvers)
    - Apollo Server or GraphQL Yoga setup
    - GraphQL client usage (Apollo Client, urql)
  * tRPC ${MECHANISM_DESCRIPTIONS.TRPC}:
    - Procedure definitions (publicProcedure, protectedProcedure)
    - Router definitions
  * WebSockets ${MECHANISM_DESCRIPTIONS.WEBSOCKET}:
    - Socket.io usage (io.on, socket.emit)
    - ws library (WebSocket server/client)
    - WebSocket API usage
  * Messaging Systems:
    - RabbitMQ (amqplib): Channel.sendToQueue, consume => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
    - Kafka (kafkajs): producer.send, consumer.subscribe => 'KAFKA-TOPIC'
    - AWS SQS/SNS (aws-sdk): sendMessage, subscribe => 'AWS-SQS' or 'AWS-SNS'
    - Redis Pub/Sub: publish, subscribe => 'REDIS-PUBSUB'
  * gRPC ${MECHANISM_DESCRIPTIONS.GRPC}:
    - @grpc/grpc-js usage, service definitions
  * Server-Sent Events ${MECHANISM_DESCRIPTIONS.SSE}:
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
};
