/**
 * MCP server configuration
 */
export const mcpConfig = {
  // MCP protocol configuration
  MCP_SERVER_NAME: "MCPAnalyzeDataServer",
  MCP_SERVER_VERSION: "0.0.1",
  BUSPROCS_RSC_NAME: "businessprocesses",
  BUSPROCS_RSC_TEMPLATE: "businessprocesses://list",
  URL_PATH_MCP: "/mcp",

  // MCP HTTPserver configuration
  DEFAULT_MCP_HOSTNAME: "localhost",
  DEFAULT_MCP_PORT: 3001,

  // HTTP Protocol constants
  HTTP_PROTOCOL: "http://",
  CONTENT_TYPE_HEADER: "Content-Type",
  APPLICATION_JSON: "application/json",
  UTF8_ENCODING: "utf8",

  // HTTP Methods
  HTTP_METHOD_OPTIONS: "OPTIONS",
  HTTP_METHOD_POST: "POST",

  // HTTP Status Codes
  HTTP_STATUS_OK: 200,
  HTTP_STATUS_BAD_REQUEST: 400,
  HTTP_STATUS_NOT_FOUND: 404,
  HTTP_STATUS_INTERNAL_ERROR: 500,

  // JSON-RPC constants
  JSONRPC_VERSION: "2.0",
  JSONRPC_INTERNAL_ERROR: -32603,
  JSONRPC_SERVER_ERROR: -32000,

  // CORS Configuration
  CORS_ALLOW_ORIGIN: "Access-Control-Allow-Origin",
  CORS_ALLOW_ALL: "*",
  CORS_ALLOW_HEADERS: "Access-Control-Allow-Headers",
  CORS_ALLOWED_HEADERS_VALUE: "Content-Type, Mcp-Session-Id",
  CORS_EXPOSE_HEADERS: "Access-Control-Expose-Headers",
  CORS_EXPOSED_HEADERS_VALUE: "Mcp-Session-Id",
  CORS_ALLOW_METHODS: "Access-Control-Allow-Methods",
  CORS_ALLOWED_METHODS_VALUE: "GET, POST, DELETE, OPTIONS",

  // MCP Session
  MCP_SESSION_ID_HEADER: "mcp-session-id",

  // Node.js Event Names
  DATA_EVENT: "data",
  END_EVENT: "end",
  ERROR_EVENT: "error",
} as const;
