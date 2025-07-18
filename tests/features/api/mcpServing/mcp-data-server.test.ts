import "reflect-metadata";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import McpDataServer from "../../../../src/components/api/mcpServing/mcp-data-server";
import type InsightsDataServer from "../../../../src/components/api/mcpServing/insights-data-server";
import { mcpConfig } from "../../../../src/components/api/mcpServing/mcp.config";

// Mock the MCP SDK
jest.mock("@modelcontextprotocol/sdk/server/mcp.js", () => ({
  McpServer: jest.fn(),
  ResourceTemplate: jest.fn(),
}));

describe("McpDataServer", () => {
  let mcpDataServer: McpDataServer;
  let mockInsightsDataServer: jest.Mocked<InsightsDataServer>;
  let mockMcpServer: jest.Mocked<McpServer>;
  let mockGetBusinessProcesses: jest.MockedFunction<() => Promise<unknown>>;
  let mockRegisterResource: jest.MockedFunction<McpServer["registerResource"]>;

  beforeEach(() => {
    // Create mock functions
    mockGetBusinessProcesses = jest.fn();
    mockRegisterResource = jest.fn();

    // Create mock InsightsDataServer
    mockInsightsDataServer = {
      getBusinessProcesses: mockGetBusinessProcesses,
    } as unknown as jest.Mocked<InsightsDataServer>;

    // Create mock McpServer
    mockMcpServer = {
      registerResource: mockRegisterResource,
    } as unknown as jest.Mocked<McpServer>;

    // Mock the McpServer constructor
    (McpServer as jest.Mock).mockImplementation(() => mockMcpServer);

    // Mock the ResourceTemplate constructor
    const mockResourceTemplate = {};
    (ResourceTemplate as jest.Mock).mockImplementation(() => mockResourceTemplate);

    // Create instance
    mcpDataServer = new McpDataServer(mockInsightsDataServer);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("configure", () => {
    it("should create an MCP server with correct configuration", () => {
      // Act
      mcpDataServer.configure();

      // Assert
      expect(McpServer).toHaveBeenCalledWith({
        name: mcpConfig.MCP_SERVER_NAME,
        version: mcpConfig.MCP_SERVER_VERSION,
      });
    });

    it("should register the business processes resource with correct parameters", () => {
      // Act
      mcpDataServer.configure();

      // Assert
      expect(ResourceTemplate).toHaveBeenCalledWith(mcpConfig.BUSPROCS_RSC_TEMPLATE, {
        list: undefined,
      });

      expect(mockRegisterResource).toHaveBeenCalledWith(
        mcpConfig.BUSPROCS_RSC_NAME,
        expect.any(Object), // ResourceTemplate instance
        {
          title: "Business Processes",
          description: "Lists the main business processes of the application.",
          mimeType: mcpConfig.APPLICATION_JSON,
        },
        expect.any(Function), // Resource handler function
      );
    });

    it("should return the configured MCP server", () => {
      // Act
      const result = mcpDataServer.configure();

      // Assert
      expect(result).toBe(mockMcpServer);
    });

    it("should create a resource handler that calls InsightsDataServer", async () => {
      // Arrange
      const mockBusinessProcesses = [
        { name: "Process 1", description: "Description 1" },
        { name: "Process 2", description: "Description 2" },
      ];
      mockGetBusinessProcesses.mockResolvedValue(mockBusinessProcesses);

      // Act
      mcpDataServer.configure();

      // Extract the resource handler function from the mock call
      const registerResourceCall = mockRegisterResource.mock.calls[0];
      const resourceHandler = registerResourceCall[3] as (uri: URL) => Promise<unknown>;

      // Create a mock URI
      const mockUri = new URL("businessprocesses://list");

      // Call the resource handler
      const result = await resourceHandler(mockUri);

      // Assert
      expect(mockGetBusinessProcesses).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        contents: [
          {
            uri: mockUri.href,
            text: JSON.stringify(mockBusinessProcesses, null, 2),
          },
        ],
      });
    });

    it("should handle errors in the resource handler gracefully", async () => {
      // Arrange
      const mockError = new Error("Database error");
      mockGetBusinessProcesses.mockRejectedValue(mockError);

      // Act
      mcpDataServer.configure();

      // Extract the resource handler function from the mock call
      const registerResourceCall = mockRegisterResource.mock.calls[0];
      const resourceHandler = registerResourceCall[3] as (uri: URL) => Promise<unknown>;

      // Create a mock URI
      const mockUri = new URL("businessprocesses://list");

      // Assert
      await expect(resourceHandler(mockUri)).rejects.toThrow("Database error");
    });
  });
});
