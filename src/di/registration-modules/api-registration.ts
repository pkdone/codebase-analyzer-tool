import { apiTokens } from "../tokens";
import { registerComponents } from "../registration-utils";

// API component imports
import InsightsDataProvider from "../../components/api/mcpServing/insights-data-provider";
import McpServerFactory from "../../components/api/mcpServing/mcp-server-configurator";
import McpHttpServer from "../../components/api/mcpServing/mcp-http-server";

/**
 * Register API-related components in the DI container.
 *
 * This module handles the registration of components responsible for:
 * - MCP (Model Context Protocol) server functionality
 * - HTTP server for API endpoints
 * - Data serving for insights and general queries
 */
export function registerApiComponents(): void {
  registerComponents(
    [
      { token: apiTokens.InsightsDataProvider, implementation: InsightsDataProvider },
      { token: apiTokens.McpServerFactory, implementation: McpServerFactory },
      { token: apiTokens.McpHttpServer, implementation: McpHttpServer },
    ],
    "API components registered",
  );
}
