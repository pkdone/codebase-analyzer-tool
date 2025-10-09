import { injectable, inject } from "tsyringe";
import { createServer, Server } from "node:http";
import { randomUUID } from "node:crypto";
import { text as consumeText } from "node:stream/consumers";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { logErrorMsgAndDetail } from "../../../common/utils/logging";
import { mcpConfig } from "./mcp.config";
import McpServerConfigurator from "./mcp-server-configurator";
import { TOKENS } from "../../../di/tokens";
import type { IncomingMessage, ServerResponse } from "node:http";

/**
 * Class to handle HTTP requests and responses for the Model Context Protocol (MCP) server using raw Node.js HTTP server.
 */
@injectable()
export default class McpHttpServer {
  private readonly mcpServer: McpServer;
  private readonly transports = new Map<string, StreamableHTTPServerTransport>();
  private server?: Server;

  /**
   * Constructor.
   */
  constructor(
    @inject(TOKENS.McpDataServer) private readonly mcpServerConfigurator: McpServerConfigurator,
  ) {
    this.mcpServer = this.mcpServerConfigurator.configure();
  }

  /**
   * Starts the MCP HTTP server.
   */
  async start(): Promise<void> {
    const mcpHandler = this.createMcpHandler();

    // Create HTTP server with MCP handler
    this.server = createServer((req, res) => {
      const url = new URL(
        req.url ?? "",
        `${mcpConfig.HTTP_PROTOCOL}${req.headers.host ?? mcpConfig.DEFAULT_MCP_HOSTNAME}`,
      );

      // Handle MCP requests
      if (url.pathname === mcpConfig.URL_PATH_MCP) {
        // Handle MCP requests asynchronously
        mcpHandler(req, res).catch((error: unknown) => {
          logErrorMsgAndDetail("Error handling MCP request", error);
          if (!res.headersSent) {
            this.sendJsonRpcError(
              res,
              mcpConfig.HTTP_STATUS_INTERNAL_ERROR,
              mcpConfig.JSONRPC_INTERNAL_ERROR,
              "Internal Server Error",
            );
          }
        });
      } else {
        // Handle other requests with a simple 404 response
        res.writeHead(mcpConfig.HTTP_STATUS_NOT_FOUND, {
          [mcpConfig.CONTENT_TYPE_HEADER]: mcpConfig.APPLICATION_JSON,
        });
        res.end(
          JSON.stringify({
            error: "Not Found",
            message: `Path ${url.pathname} not found. Available endpoints: ${mcpConfig.URL_PATH_MCP}`,
          }),
        );
      }
    });

    // Start listening on the configured port
    return new Promise<void>((resolve, reject) => {
      if (this.server) {
        this.server.listen(mcpConfig.DEFAULT_MCP_PORT, (error?: Error) => {
          if (error) {
            reject(error);
          } else {
            console.log(
              `MCP server listening on ${mcpConfig.HTTP_PROTOCOL}${mcpConfig.DEFAULT_MCP_HOSTNAME}:${mcpConfig.DEFAULT_MCP_PORT}`,
            );
            resolve();
          }
        });
      } else {
        reject(new Error("Server not initialized"));
      }
    });
  }

  /**
   * Stops the MCP HTTP server.
   */
  async stop(): Promise<void> {
    if (this.server) {
      const server = this.server;
      return new Promise<void>((resolve, reject) => {
        server.close((error?: Error) => {
          if (error) {
            reject(error);
          } else {
            console.log("MCP server stopped");
            resolve();
          }
        });
      });
    }
    return Promise.resolve();
  }

  /**
   * Creates a raw Node.js HTTP handler for MCP requests.
   * This includes CORS handling and session management.
   */
  private createMcpHandler() {
    return async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
      try {
        // Set CORS headers for all MCP requests
        res.setHeader(mcpConfig.CORS_ALLOW_ORIGIN, mcpConfig.CORS_ALLOW_ALL);
        res.setHeader(mcpConfig.CORS_ALLOW_HEADERS, mcpConfig.CORS_ALLOWED_HEADERS_VALUE);
        res.setHeader(mcpConfig.CORS_EXPOSE_HEADERS, mcpConfig.CORS_EXPOSED_HEADERS_VALUE);
        res.setHeader(mcpConfig.CORS_ALLOW_METHODS, mcpConfig.CORS_ALLOWED_METHODS_VALUE);

        // Handle preflight requests
        if (req.method === mcpConfig.HTTP_METHOD_OPTIONS) {
          res.writeHead(mcpConfig.HTTP_STATUS_OK);
          res.end();
          return;
        }

        // Check for existing session ID
        const sessionIdHeader = req.headers[mcpConfig.MCP_SESSION_ID_HEADER];
        let transport: StreamableHTTPServerTransport;
        let body: unknown;

        if (typeof sessionIdHeader === "string" && this.transports.has(sessionIdHeader)) {
          // Reuse existing transport
          const sessionId = sessionIdHeader; // Safely typed as string
          const existingTransport = this.transports.get(sessionId);
          if (existingTransport) {
            transport = existingTransport;
            body = await this.parseRequestBody(req);
          } else {
            this.sendJsonRpcError(
              res,
              mcpConfig.HTTP_STATUS_BAD_REQUEST,
              mcpConfig.JSONRPC_SERVER_ERROR,
              "Bad Request: Invalid session ID",
            );
            return;
          }
        } else {
          // Parse request body
          body = await this.parseRequestBody(req);

          if (req.method === mcpConfig.HTTP_METHOD_POST && isInitializeRequest(body)) {
            // Create new transport for initialization request
            transport = new StreamableHTTPServerTransport({
              sessionIdGenerator: () => randomUUID(),
              onsessioninitialized: (newSessionId) => {
                this.transports.set(newSessionId, transport);
                console.log(`MCP session initialized with ID: ${newSessionId}`);
              },
            });

            // Set up onclose handler to clean up transport when closed
            transport.onclose = () => {
              if (transport.sessionId) {
                this.transports.delete(transport.sessionId);
                console.log(`MCP session ${transport.sessionId} closed and removed.`);
              }
            };

            // Connect the transport to the MCP server
            await this.mcpServer.connect(transport);
          } else {
            // Invalid request - no session ID or not initialization request
            // Attempt to extract an id from the body if present per JSON-RPC 2.0
            let requestId: string | number | null = null;
            if (typeof body === "object" && body !== null && "id" in body) {
              const potentialId = (body as Record<string, unknown>).id;
              if (typeof potentialId === "string" || typeof potentialId === "number") {
                requestId = potentialId;
              }
            }
            this.sendJsonRpcError(
              res,
              mcpConfig.HTTP_STATUS_BAD_REQUEST,
              mcpConfig.JSONRPC_SERVER_ERROR,
              "Bad Request: No valid session ID provided",
              requestId,
            );
            return;
          }
        }

        // Handle the request with the transport
        await transport.handleRequest(req, res, body);
      } catch (error: unknown) {
        // Check if it's a JSON parsing error
        if (error instanceof Error && error.message.startsWith("Failed to parse JSON")) {
          this.sendJsonRpcError(
            res,
            mcpConfig.HTTP_STATUS_BAD_REQUEST,
            -32700, // JSON-RPC Parse Error
            "Parse error",
          );
          return;
        }

        // Handle other errors as internal server errors
        logErrorMsgAndDetail("Error in MCP request handler", error);
        if (!res.headersSent) {
          this.sendJsonRpcError(
            res,
            mcpConfig.HTTP_STATUS_INTERNAL_ERROR,
            mcpConfig.JSONRPC_INTERNAL_ERROR,
            "Internal Server Error",
          );
        }
      }
    };
  }

  /**
   * Sends a standardized JSON-RPC error response.
   *
   * @param res - The HTTP response object
   * @param httpStatusCode - The HTTP status code to set
   * @param jsonRpcErrorCode - The JSON-RPC error code
   * @param message - The error message
   * @param id - The request ID (defaults to null for protocol errors)
   */
  private sendJsonRpcError(
    res: ServerResponse,
    httpStatusCode: number,
    jsonRpcErrorCode: number,
    message: string,
    id: string | number | null = null,
  ): void {
    res.writeHead(httpStatusCode, {
      [mcpConfig.CONTENT_TYPE_HEADER]: mcpConfig.APPLICATION_JSON,
    });
    res.end(
      JSON.stringify({
        jsonrpc: mcpConfig.JSONRPC_VERSION,
        error: { code: jsonRpcErrorCode, message },
        id,
      }),
    );
  }

  /**
   * Parses the request body from an IncomingMessage.
   */
  private async parseRequestBody(req: IncomingMessage): Promise<unknown> {
    try {
      const data = await consumeText(req);
      return data ? (JSON.parse(data) as unknown) : {};
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse JSON: ${message}`);
    }
  }
}
