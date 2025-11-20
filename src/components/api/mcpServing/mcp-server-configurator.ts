import { injectable, inject } from "tsyringe";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import InsightsDataProvider from "./insights-data-provider";
import { mcpConfig } from "./mcp.config";
import { apiTokens } from "../../../di/tokens";

/**
 * Factory class for creating and configuring MCP server instances.
 */
@injectable()
export default class McpServerFactory {
  /**
   * Constructor.
   */
  constructor(
    @inject(apiTokens.InsightsDataProvider)
    private readonly analysisDataServer: InsightsDataProvider,
  ) {}

  /**
   * Configures the MCP server with the given AnalysisDataServer.
   */
  configure() {
    const mcpServer = new McpServer({
      name: mcpConfig.MCP_SERVER_NAME,
      version: mcpConfig.MCP_SERVER_VERSION,
    });

    mcpServer.registerResource(
      mcpConfig.BUSPROCS_RSC_NAME,
      new ResourceTemplate(mcpConfig.BUSPROCS_RSC_TEMPLATE, { list: undefined }),
      {
        title: "Business Processes",
        description: "Lists the main business processes of the application.",
        mimeType: "application/json",
      },
      async (uri: URL) => ({
        contents: [
          {
            uri: uri.href,
            text: JSON.stringify(await this.analysisDataServer.getBusinessProcesses(), null, 2),
          },
        ],
      }),
    );

    return mcpServer;
  }
}
