import { createDbMechanismInstructions, dbMech } from "../../utils";
import type { LanguageSpecificFragments } from "../../sources.types";
import { MECHANISM_DESCRIPTIONS } from "../features/common.fragments";

/**
 * C++-specific instruction fragments.
 * @satisfies {LanguageSpecificFragments}
 */
export const CPP_SPECIFIC_FRAGMENTS: LanguageSpecificFragments = {
  INTERNAL_REFS:
    'A list of #include directives for project headers (quoted includes like #include "myclass.hpp") belonging to this same application (do not include system headers, STL, or third-party library headers)',
  EXTERNAL_REFS:
    "A list of #include directives for system, STL, and library headers (angle bracket includes like #include <vector>, <string>, <iostream>, <boost/...>, <Qt...>) that are external to this application",
  PUBLIC_CONSTANTS:
    "A list of public constants including constexpr variables, const variables, #define macros, and enum/enum class values (name, value, and purpose)",
  PUBLIC_METHODS:
    "A list of public methods - for each method include: name, purpose in detail, parameters (name and type), return type, const/virtual/static qualifiers, and a very detailed description of its implementation",
  KIND_OVERRIDE: "Its kind ('class', 'struct', 'enum', 'union', or 'namespace')",
  INTEGRATION_INSTRUCTIONS: `  * Socket programming (mechanism: 'OTHER' - describe as 'TCP/IP Sockets'):
    - BSD socket API or C++ wrappers: socket(), bind(), listen(), accept(), connect()
    - Boost.Asio: boost::asio::ip::tcp::socket, async_read, async_write
  * HTTP client libraries ${MECHANISM_DESCRIPTIONS.REST}:
    - libcurl (C++ wrapper or direct): curl_easy_init(), CURLOPT_URL
    - C++ REST SDK (cpprestsdk): web::http::client::http_client
    - Boost.Beast: beast::http::request, beast::http::response
  * Qt networking ${MECHANISM_DESCRIPTIONS.REST} or ${MECHANISM_DESCRIPTIONS.WEBSOCKET}:
    - QNetworkAccessManager, QNetworkRequest, QNetworkReply
    - QTcpSocket, QUdpSocket, QWebSocket
  * gRPC ${MECHANISM_DESCRIPTIONS.GRPC}:
    - grpc::Server, grpc::ServerBuilder
    - grpc::Channel, grpc::ClientContext, stub classes
  * Messaging (mechanism varies):
    - ZeroMQ (zmq::socket_t, zmq::message_t) => 'OTHER' (describe as 'ZeroMQ')
    - RabbitMQ C++ client => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
    - Kafka (librdkafka): rd_kafka_t, rd_kafka_produce => 'KAFKA-TOPIC'`,
  DB_MECHANISM_MAPPING: createDbMechanismInstructions([
    `      - Uses ODBC API (SQLConnect, SQLDriverConnect, SQLExecDirect) => ${dbMech("DRIVER")}`,
    `      - Uses MySQL Connector/C++ (sql::mysql::MySQL_Driver, sql::Connection) => ${dbMech("DRIVER")}`,
    `      - Uses PostgreSQL libpqxx (pqxx::connection, pqxx::work, pqxx::result) => ${dbMech("DRIVER")}`,
    `      - Uses SQLite3 (sqlite3_open, sqlite3_exec) or SQLiteCpp wrapper => ${dbMech("DRIVER")}`,
    `      - Uses SOCI library (soci::session, soci::statement) => ${dbMech("ORM")}`,
    `      - Uses Qt SQL module (QSqlDatabase, QSqlQuery, QSqlTableModel) => ${dbMech("DRIVER")}`,
    `      - Uses ODB ORM (odb::database, odb::transaction, persistent classes) => ${dbMech("ORM")}`,
    `      - Uses sqlpp11 (sqlpp::connection, query builders) => ${dbMech("ORM")}`,
    `      - Contains inline SQL strings => ${dbMech("SQL")}`,
    `      - Uses Redis client (hiredis, redis-plus-plus) => ${dbMech("REDIS")}`,
    `      - Uses MongoDB C++ driver (mongocxx::client, mongocxx::collection) => ${dbMech("MQL")}`,
  ]),
};
