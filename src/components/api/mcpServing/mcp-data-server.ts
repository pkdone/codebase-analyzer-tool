import { injectable, inject } from "tsyringe";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import InsightsDataServer from "./insights-data-server";
import { mcpConfig } from "./mcp.config";
import { TOKENS } from "../../../di/tokens";

/**
 * Class representing the MCP Data Server.
 */
@injectable()
export default class McpDataServer {
  /**
   * Constructor.
   */
  constructor(
    @inject(TOKENS.InsightsDataServer) private readonly analysisDataServer: InsightsDataServer,
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
