import { createDbMechanismInstructions } from "../utils";
import type { LanguageSpecificFragments } from "../sources.fragments";
import { MECHANISM_DESCRIPTIONS } from "./common.fragments";

/**
 * C-specific instruction fragments.
 * @satisfies {LanguageSpecificFragments}
 */
export const C_SPECIFIC_FRAGMENTS: LanguageSpecificFragments = {
  INTERNAL_REFS:
    'A list of #include directives for project headers (quoted includes like #include "myheader.h") belonging to this same application (do not include system headers or third-party library headers)',
  EXTERNAL_REFS:
    "A list of #include directives for system and library headers (angle bracket includes like #include <stdio.h>, <stdlib.h>, <string.h>, <pthread.h>) that are external to this application",
  PUBLIC_CONSTANTS:
    "A list of public constants including #define macros, const variables, and enum values (name, value, and purpose)",
  PUBLIC_FUNCTIONS:
    "A list of function definitions (not just declarations) - for each function include: name, purpose in detail, parameters (name and type), return type, and a very detailed description of its implementation",
  INTEGRATION_INSTRUCTIONS: `  * Socket programming (mechanism: 'OTHER' - describe as 'TCP/IP Sockets' or 'UDP Sockets'):
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
  DB_MECHANISM_MAPPING: createDbMechanismInstructions([
    "      - Uses ODBC API (SQLConnect, SQLDriverConnect, SQLExecDirect, SQLFetch, SQLBindCol) => mechanism: 'DRIVER'",
    "      - Uses MySQL C API (mysql_init, mysql_real_connect, mysql_query, mysql_store_result) => mechanism: 'DRIVER'",
    "      - Uses PostgreSQL libpq (PQconnectdb, PQexec, PQgetvalue, PQclear) => mechanism: 'DRIVER'",
    "      - Uses SQLite3 C API (sqlite3_open, sqlite3_exec, sqlite3_prepare_v2, sqlite3_step) => mechanism: 'DRIVER'",
    "      - Uses Oracle OCI (OCIInitialize, OCILogon, OCIStmtExecute) => mechanism: 'DRIVER'",
    "      - Uses MongoDB C driver (mongoc_client_t, mongoc_collection_find_with_opts, mongoc_cursor_next) => mechanism: 'MQL'",
    "      - Uses embedded SQL (EXEC SQL ... END-EXEC) => mechanism: 'SQL'",
    "      - Contains inline SQL strings in sprintf/snprintf for query building => mechanism: 'SQL'",
    "      - Uses Berkeley DB (db_create, DB->open, DB->get, DB->put) => mechanism: 'DRIVER'",
  ]),
};
