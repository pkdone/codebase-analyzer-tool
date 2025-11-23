import { appConfig } from "../../../config/app.config";
import { commonConstants } from "../../../common/constants";

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

  // Application constants referenced from appConfig
  APPLICATION_JSON: appConfig.MIME_TYPE_JSON,
  UTF8_ENCODING: commonConstants.UTF8_ENCODING,

  // JSON-RPC constants
  JSONRPC_VERSION: "2.0",
  JSONRPC_PARSE_ERROR: -32700,
  JSONRPC_INTERNAL_ERROR: -32603,
  JSONRPC_SERVER_ERROR: -32000,

  // MCP-specific CORS header values
  CORS_ALLOWED_HEADERS_VALUE: "Content-Type, Mcp-Session-Id",
  CORS_EXPOSED_HEADERS_VALUE: "Mcp-Session-Id",
  CORS_ALLOWED_METHODS_VALUE: "GET, POST, DELETE, OPTIONS",

  // MCP Session
  MCP_SESSION_ID_HEADER: "mcp-session-id",
} as const;
