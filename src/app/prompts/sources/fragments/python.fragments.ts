import { createDbMechanismInstructions } from "../utils";
import type { LanguageSpecificFragments } from "../sources.types";

/**
 * Python-specific instruction fragments.
 * Includes PYTHON_COMPLEXITY_METRICS for language-specific complexity analysis.
 * @satisfies {LanguageSpecificFragments}
 */
export const PYTHON_SPECIFIC_FRAGMENTS: LanguageSpecificFragments = {
  INTERNAL_REFS:
    "A list of internal references (imports that belong to this same project; exclude Python stdlib & third‑party packages)",
  EXTERNAL_REFS:
    "A list of external references (third‑party libraries imported; exclude stdlib modules like sys, os, json, typing, pathlib, re, math, datetime, logging, asyncio, dataclasses, functools, itertools)",
  PUBLIC_CONSTANTS:
    "A list of public constants (UPPERCASE module-level assignments; include name, redacted value, brief type/role)",
  PUBLIC_FUNCTIONS:
    "A list of its public functions/methods – for each include: name, purpose (detailed), parameters (name + type hint or inferred type; if no hint, describe expected type), returnType (type hint or inferred description of returned value shape), implementation (very detailed explanation of logic, branches, important data transformations, exception handling), cyclomaticComplexity (see rules), linesOfCode (exclude blank lines & comments), codeSmells (if any; use EXACT enum labels)",
  KIND_OVERRIDE: "Its kind ('class', 'module', 'function', or 'package'; choose the dominant one)",
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
};

/**
 * Python-specific complexity metrics instructions.
 */
export const PYTHON_COMPLEXITY_METRICS = `Cyclomatic complexity (Python):
- Start at 1; +1 for each if / elif / for / while / except / finally / with (when it controls resource flow) / comprehension 'for' / ternary / logical operator (and/or) in a condition / match case arm
- +1 for each additional 'if' inside a comprehension
For each public function/method capture: cyclomaticComplexity, linesOfCode, and codeSmells
File-level metrics: totalFunctions, averageComplexity, maxComplexity, averageFunctionLength, fileSmells (e.g. 'LARGE FILE', 'TOO MANY METHODS', 'GOD CLASS', 'FEATURE ENVY')`;
