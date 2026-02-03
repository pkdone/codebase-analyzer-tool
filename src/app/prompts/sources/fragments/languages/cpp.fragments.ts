import { createCFamilyFragments, MECHANISM_DESCRIPTIONS, dbMech } from "./c-family.fragments";
import type { LanguageSpecificFragments } from "../../sources.types";

/**
 * C++-specific instruction fragments.
 * Uses the shared C-family factory with C++-specific configuration.
 * @satisfies {LanguageSpecificFragments}
 */
export const CPP_SPECIFIC_FRAGMENTS: LanguageSpecificFragments = createCFamilyFragments({
  headerExtension: ".hpp",
  externalHeaderExamples: "<vector>, <string>, <iostream>, <boost/...>, <Qt...>",
  externalRefsAdditionalText: ", STL,",
  constantsPrefix: "constexpr variables, ",
  enumDescription: "enum/enum class values",
  publicFunctionsOrMethodsDescription:
    "A list of public methods - for each method include: name, purpose in detail, parameters (name and type), return type, const/virtual/static qualifiers, and a very detailed description of its implementation",
  usePublicMethods: true,
  kindOverride: "Its kind ('class', 'struct', 'enum', 'union', or 'namespace')",
  integrationInstructions: `  * Socket programming (mechanism: 'OTHER' - describe as 'TCP/IP Sockets'):
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
  dbMechanismMappings: [
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
  ],
});
