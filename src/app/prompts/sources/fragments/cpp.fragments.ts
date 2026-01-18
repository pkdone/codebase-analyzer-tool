import { createDbMechanismInstructions } from "../source-instruction-utils";
import type { LanguageSpecificFragments } from "../sources.fragments";

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
  * HTTP client libraries (mechanism: 'REST'):
    - libcurl (C++ wrapper or direct): curl_easy_init(), CURLOPT_URL
    - C++ REST SDK (cpprestsdk): web::http::client::http_client
    - Boost.Beast: beast::http::request, beast::http::response
  * Qt networking (mechanism: 'REST' or 'WEBSOCKET'):
    - QNetworkAccessManager, QNetworkRequest, QNetworkReply
    - QTcpSocket, QUdpSocket, QWebSocket
  * gRPC (mechanism: 'GRPC'):
    - grpc::Server, grpc::ServerBuilder
    - grpc::Channel, grpc::ClientContext, stub classes
  * Messaging (mechanism varies):
    - ZeroMQ (zmq::socket_t, zmq::message_t) => 'OTHER' (describe as 'ZeroMQ')
    - RabbitMQ C++ client => 'RABBITMQ-QUEUE' or 'RABBITMQ-EXCHANGE'
    - Kafka (librdkafka): rd_kafka_t, rd_kafka_produce => 'KAFKA-TOPIC'`,
  DB_MECHANISM_MAPPING: createDbMechanismInstructions([
    "      - Uses ODBC API (SQLConnect, SQLDriverConnect, SQLExecDirect) => mechanism: 'DRIVER'",
    "      - Uses MySQL Connector/C++ (sql::mysql::MySQL_Driver, sql::Connection) => mechanism: 'DRIVER'",
    "      - Uses PostgreSQL libpqxx (pqxx::connection, pqxx::work, pqxx::result) => mechanism: 'DRIVER'",
    "      - Uses SQLite3 (sqlite3_open, sqlite3_exec) or SQLiteCpp wrapper => mechanism: 'DRIVER'",
    "      - Uses SOCI library (soci::session, soci::statement) => mechanism: 'ORM'",
    "      - Uses Qt SQL module (QSqlDatabase, QSqlQuery, QSqlTableModel) => mechanism: 'DRIVER'",
    "      - Uses ODB ORM (odb::database, odb::transaction, persistent classes) => mechanism: 'ORM'",
    "      - Uses sqlpp11 (sqlpp::connection, query builders) => mechanism: 'ORM'",
    "      - Contains inline SQL strings => mechanism: 'SQL'",
    "      - Uses Redis client (hiredis, redis-plus-plus) => mechanism: 'REDIS'",
    "      - Uses MongoDB C++ driver (mongocxx::client, mongocxx::collection) => mechanism: 'MQL'",
  ]),
};
