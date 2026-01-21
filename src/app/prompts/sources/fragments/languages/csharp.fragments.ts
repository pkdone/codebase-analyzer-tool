import { createDbMechanismInstructions } from "../../utils";
import type { LanguageSpecificFragments } from "../../sources.types";
import { MECHANISM_DESCRIPTIONS } from "../features/common.fragments";

/**
 * C#-specific instruction fragments.
 * @satisfies {LanguageSpecificFragments}
 */
export const CSHARP_SPECIFIC_FRAGMENTS: LanguageSpecificFragments = {
  INTERNAL_REFS:
    "A list of the internal references to other application classes - fully qualified type names (only include 'using' directives that clearly belong to this same application's code – exclude BCL / System.* and third-party packages)",
  EXTERNAL_REFS:
    "A list of the external references to 3rd party / NuGet package classes (Fully qualified type names) it depends on (exclude System.* where possible)",
  PUBLIC_CONSTANTS:
    "A list of public constants / readonly static fields (if any) – include name, value (redact secrets), and a short type/role description",
  PUBLIC_METHODS:
    "A list of its public methods (if any) – for each method list: name, purpose (detailed), parameters (name and type), return type, async/sync indicator, and a very detailed implementation description highlighting notable control flow, LINQ queries, awaits, exception handling, and important business logic decisions",
  KIND_OVERRIDE: "Its kind ('class', 'interface', 'record', or 'struct')",
  INTEGRATION_INSTRUCTIONS: `  * REST APIs ${MECHANISM_DESCRIPTIONS.REST}:
    - ASP.NET Core MVC/Web API controller actions with [HttpGet], [HttpPost], [HttpPut], [HttpDelete], [HttpPatch], [Route]
    - ASP.NET Core Minimal API endpoints (MapGet, MapPost, MapPut, MapDelete)
    - HTTP client calls (HttpClient, RestSharp, Refit interfaces)
  * WCF/SOAP Services ${MECHANISM_DESCRIPTIONS.SOAP}:
    - WCF service contracts ([ServiceContract], [OperationContract])
    - SOAP service references, WCF client proxies
    - BasicHttpBinding, WSHttpBinding configurations
  * Messaging Systems:
    - Azure Service Bus (ServiceBusClient, QueueClient for queues, TopicClient for topics) => 'AZURE-SERVICE-BUS-QUEUE' or 'AZURE-SERVICE-BUS-TOPIC'
    - RabbitMQ.Client usage (IModel.BasicPublish, BasicConsume) => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
    - MSMQ (MessageQueue class) => 'OTHER' (specify MSMQ in description and protocol)
    - AWS SQS/SNS (AWSSDK) => 'AWS-SQS' or 'AWS-SNS'
  * gRPC ${MECHANISM_DESCRIPTIONS.GRPC}:
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
};
