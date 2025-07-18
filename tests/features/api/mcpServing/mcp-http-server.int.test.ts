/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any, @typescript-eslint/unbound-method */
import "reflect-metadata";
import { randomUUID } from "node:crypto";
import { IncomingMessage, ServerResponse, createServer } from "node:http";
import { Readable } from "node:stream";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import McpHttpServer from "../../../../src/components/api/mcpServing/mcp-http-server";
import type McpDataServer from "../../../../src/components/api/mcpServing/mcp-data-server";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Mock the MCP SDK
jest.mock("@modelcontextprotocol/sdk/server/streamableHttp.js");
jest.mock("@modelcontextprotocol/sdk/types.js");

// Mock node:http module
jest.mock("node:http", () => ({
  createServer: jest.fn(),
}));

// Create a mock request helper
const createMockRequest = (
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: unknown,
): IncomingMessage => {
  const req = new Readable({
    read() {
      if (body) {
        this.push(JSON.stringify(body));
      }
      this.push(null);
    },
  }) as IncomingMessage;

  req.method = method;
  req.url = url;
  req.headers = headers;
  req.setEncoding = jest.fn();

  return req;
};

// Create a mock response helper
const createMockResponse = (): ServerResponse => {
  const res = {
    writeHead: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
    setHeader: jest.fn(),
    headersSent: false,
    writableEnded: false,
  } as unknown as ServerResponse;

  return res;
};

describe("McpHttpServer Integration Tests", () => {
  let mcpHttpServer: McpHttpServer;
  let mockMcpDataServer: jest.Mocked<McpDataServer>;
  let mockMcpServer: jest.Mocked<McpServer>;

  beforeEach(() => {
    // Mock MCP Server
    mockMcpServer = {
      connect: jest.fn(),
      close: jest.fn(),
    } as unknown as jest.Mocked<McpServer>;

    // Mock MCP Data Server
    mockMcpDataServer = {
      configure: jest.fn().mockReturnValue(mockMcpServer),
    } as unknown as jest.Mocked<McpDataServer>;

    // Mock isInitializeRequest
    jest.mocked(isInitializeRequest).mockReturnValue(false);

    // Create instance
    mcpHttpServer = new McpHttpServer(mockMcpDataServer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("start and stop methods", () => {
    it("should start and stop the server successfully", async () => {
      // Mock the listen method
      const mockListen = jest
        .fn()
        .mockImplementation((_port: number, callback: (error?: Error) => void) => {
          callback();
        });

      // Mock the close method
      const mockClose = jest.fn().mockImplementation((callback: (error?: Error) => void) => {
        callback();
      });

      // Mock createServer to return a mock server
      const mockServer = {
        listen: mockListen,
        close: mockClose,
      } as any;

      // Mock the createServer function
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      jest.mocked(createServer).mockReturnValue(mockServer);

      // Start the server
      await mcpHttpServer.start();

      // Verify server was created and is listening
      expect(createServer).toHaveBeenCalledWith(expect.any(Function));
      expect(mockListen).toHaveBeenCalledWith(expect.any(Number), expect.any(Function));

      // Stop the server
      await mcpHttpServer.stop();

      // Verify server was closed
      expect(mockClose).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe("createMcpHandler", () => {
    it("should handle CORS preflight requests", async () => {
      // Arrange
      const req = createMockRequest("OPTIONS", "/mcp", {});
      const res = createMockResponse();

      const handler = mcpHttpServer.createMcpHandler();

      // Act
      await handler(req, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Headers",
        "Content-Type, Mcp-Session-Id",
      );
      expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Expose-Headers", "Mcp-Session-Id");
      expect(res.setHeader).toHaveBeenCalledWith(
        "Access-Control-Allow-Methods",
        "GET, POST, DELETE, OPTIONS",
      );
      expect(res.writeHead).toHaveBeenCalledWith(200);
      expect(res.end).toHaveBeenCalledWith();
    });

    it("should handle initialization request and create new session", async () => {
      // Arrange
      const mockTransport = {
        handleRequest: jest.fn(),
        sessionId: randomUUID(),
        onclose: undefined,
        onsessioninitialized: undefined,
      };

      jest.mocked(StreamableHTTPServerTransport).mockImplementation(() => mockTransport as any);

      const initializeRequest = {
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
        id: 1,
      };

      jest.mocked(isInitializeRequest).mockReturnValue(true);

      const req = createMockRequest("POST", "/mcp", {}, initializeRequest);
      const res = createMockResponse();

      const handler = mcpHttpServer.createMcpHandler();

      // Act
      await handler(req, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
      expect(StreamableHTTPServerTransport).toHaveBeenCalledWith({
        sessionIdGenerator: expect.any(Function),
        onsessioninitialized: expect.any(Function),
      });
      expect(mockMcpServer.connect).toHaveBeenCalledWith(mockTransport);
      expect(mockTransport.handleRequest).toHaveBeenCalledWith(req, res, initializeRequest);
    });

    it("should reject non-initialization request without session ID", async () => {
      // Arrange
      const nonInitRequest = {
        jsonrpc: "2.0",
        method: "resources/read",
        params: { uri: "businessprocesses://list" },
        id: 1,
      };

      jest.mocked(isInitializeRequest).mockReturnValue(false);

      const req = createMockRequest("POST", "/mcp", {}, nonInitRequest);
      const res = createMockResponse();

      const handler = mcpHttpServer.createMcpHandler();

      // Act
      await handler(req, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
      expect(res.writeHead).toHaveBeenCalledWith(400, { "Content-Type": "application/json" });
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32000, message: "Bad Request: No valid session ID provided" },
          id: null,
        }),
      );
    });

    it("should reuse existing transport for requests with valid session ID", async () => {
      // Arrange
      const sessionId = randomUUID();
      const mockTransport = {
        handleRequest: jest.fn(),
        sessionId,
        onclose: undefined,
        onsessioninitialized: undefined,
      };

      // First, create a session
      jest.mocked(StreamableHTTPServerTransport).mockImplementation(() => mockTransport as any);

      const initializeRequest = {
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
        id: 1,
      };

      jest.mocked(isInitializeRequest).mockReturnValue(true);

      const initReq = createMockRequest("POST", "/mcp", {}, initializeRequest);
      const initRes = createMockResponse();

      const handler = mcpHttpServer.createMcpHandler();

      // Initialize session
      await handler(initReq, initRes);

      // Trigger the onsessioninitialized callback
      const transportConstructorCall = jest.mocked(StreamableHTTPServerTransport).mock.calls[0];
      const options = transportConstructorCall[0];
      if (options.onsessioninitialized) {
        void options.onsessioninitialized(sessionId);
      }

      // Reset mocks
      jest.clearAllMocks();
      jest.mocked(isInitializeRequest).mockReturnValue(false);

      // Now test with existing session
      const resourceRequest = {
        jsonrpc: "2.0",
        method: "resources/read",
        params: { uri: "businessprocesses://list" },
        id: 2,
      };

      const req = createMockRequest(
        "POST",
        "/mcp",
        { "mcp-session-id": sessionId },
        resourceRequest,
      );
      const res = createMockResponse();

      // Act
      await handler(req, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
      expect(StreamableHTTPServerTransport).not.toHaveBeenCalled(); // Should reuse existing transport
      expect(mockTransport.handleRequest).toHaveBeenCalledWith(req, res, resourceRequest);
    });

    it("should handle request parsing errors gracefully", async () => {
      // Arrange - create a request that will cause parsing issues
      const req = new Readable({
        read() {
          this.push("invalid json that cannot be parsed");
          this.push(null);
        },
      }) as IncomingMessage;

      req.method = "POST";
      req.url = "/mcp";
      req.headers = {};
      req.setEncoding = jest.fn();

      const res = createMockResponse();
      const handler = mcpHttpServer.createMcpHandler();

      // Act
      await handler(req, res);

      // Assert
      expect(res.setHeader).toHaveBeenCalledWith("Access-Control-Allow-Origin", "*");
      expect(res.writeHead).toHaveBeenCalledWith(500, { "Content-Type": "application/json" });
      expect(res.end).toHaveBeenCalledWith(
        JSON.stringify({
          jsonrpc: "2.0",
          error: { code: -32603, message: "Internal Server Error" },
          id: null,
        }),
      );
    });

    it("should clean up transport on session close", async () => {
      // Arrange
      const sessionId = randomUUID();
      let capturedOnCloseCallback: (() => void) | undefined;

      const mockTransport = {
        handleRequest: jest.fn(),
        sessionId,
        get onclose() {
          return capturedOnCloseCallback;
        },
        set onclose(callback: (() => void) | undefined) {
          capturedOnCloseCallback = callback;
        },
        onsessioninitialized: undefined,
      };

      jest.mocked(StreamableHTTPServerTransport).mockImplementation(() => mockTransport as any);

      const initializeRequest = {
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2025-03-26",
          capabilities: {},
          clientInfo: { name: "test-client", version: "1.0.0" },
        },
        id: 1,
      };

      jest.mocked(isInitializeRequest).mockReturnValue(true);

      const req = createMockRequest("POST", "/mcp", {}, initializeRequest);
      const res = createMockResponse();

      const handler = mcpHttpServer.createMcpHandler();

      // Act
      await handler(req, res);

      // Trigger the session initialization
      const transportConstructorCall = jest.mocked(StreamableHTTPServerTransport).mock.calls[0];
      const options = transportConstructorCall[0];
      if (options.onsessioninitialized) {
        void options.onsessioninitialized(sessionId);
      }

      // Set up console.log spy to verify cleanup message
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {
        // Empty implementation for testing
      });

      // Now simulate the transport close by calling the actual onclose callback that was set by the HTTP server
      if (capturedOnCloseCallback) {
        capturedOnCloseCallback();
      }

      // Assert
      expect(consoleLogSpy).toHaveBeenCalledWith(`MCP session ${sessionId} closed and removed.`);

      // Cleanup
      consoleLogSpy.mockRestore();
    });
  });
});
