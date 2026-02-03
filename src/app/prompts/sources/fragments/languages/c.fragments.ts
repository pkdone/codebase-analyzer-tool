import { createCFamilyFragments, MECHANISM_DESCRIPTIONS, dbMech } from "./c-family.fragments";
import type { LanguageSpecificFragments } from "../../sources.types";

/**
 * C-specific instruction fragments.
 * Uses the shared C-family factory with C-specific configuration.
 * @satisfies {LanguageSpecificFragments}
 */
export const C_SPECIFIC_FRAGMENTS: LanguageSpecificFragments = createCFamilyFragments({
  headerExtension: ".h",
  externalHeaderExamples: "<stdio.h>, <stdlib.h>, <string.h>, <pthread.h>",
  enumDescription: "enum values",
  publicFunctionsOrMethodsDescription:
    "A list of function definitions (not just declarations) - for each function include: name, purpose in detail, parameters (name and type), return type, and a very detailed description of its implementation",
  usePublicMethods: false,
  integrationInstructions: `  * Socket programming (mechanism: 'OTHER' - describe as 'TCP/IP Sockets' or 'UDP Sockets'):
    - BSD socket API: socket(), bind(), listen(), accept(), connect(), send(), recv(), sendto(), recvfrom()
    - Include socket type (SOCK_STREAM for TCP, SOCK_DGRAM for UDP) and role (server/client)
  * HTTP client libraries ${MECHANISM_DESCRIPTIONS.REST}:
    - libcurl usage: curl_easy_init(), curl_easy_setopt(), curl_easy_perform()
    - Include URL patterns and HTTP methods if identifiable
  * IPC mechanisms (mechanism: 'OTHER' - describe specific IPC type):
    - Pipes: pipe(), mkfifo(), popen()
    - Shared memory: shmget(), shmat(), shmdt(), shmctl()
    - Message queues: msgget(), msgsnd(), msgrcv()
    - Semaphores: semget(), semop()
  * RPC (mechanism: 'OTHER' - describe as 'Sun RPC' or 'ONC RPC'):
    - RPC client/server implementations using rpcgen or XDR`,
  dbMechanismMappings: [
    `      - Uses ODBC API (SQLConnect, SQLDriverConnect, SQLExecDirect, SQLFetch, SQLBindCol) => ${dbMech("DRIVER")}`,
    `      - Uses MySQL C API (mysql_init, mysql_real_connect, mysql_query, mysql_store_result) => ${dbMech("DRIVER")}`,
    `      - Uses PostgreSQL libpq (PQconnectdb, PQexec, PQgetvalue, PQclear) => ${dbMech("DRIVER")}`,
    `      - Uses SQLite3 C API (sqlite3_open, sqlite3_exec, sqlite3_prepare_v2, sqlite3_step) => ${dbMech("DRIVER")}`,
    `      - Uses Oracle OCI (OCIInitialize, OCILogon, OCIStmtExecute) => ${dbMech("DRIVER")}`,
    `      - Uses MongoDB C driver (mongoc_client_t, mongoc_collection_find_with_opts, mongoc_cursor_next) => ${dbMech("MQL")}`,
    `      - Uses embedded SQL (EXEC SQL ... END-EXEC) => ${dbMech("SQL")}`,
    `      - Contains inline SQL strings in sprintf/snprintf for query building => ${dbMech("SQL")}`,
    `      - Uses Berkeley DB (db_create, DB->open, DB->get, DB->put) => ${dbMech("DRIVER")}`,
  ],
});
