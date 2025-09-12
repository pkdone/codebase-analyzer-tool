import { container } from "tsyringe";
import { TOKENS } from "../tokens";

// API component imports
import InsightsDataServer from "../../components/api/mcpServing/insights-data-server";
import McpDataServer from "../../components/api/mcpServing/mcp-data-server";
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
  // Register MCP server components
  container.registerSingleton(TOKENS.InsightsDataServer, InsightsDataServer);
  container.registerSingleton(TOKENS.McpDataServer, McpDataServer);
  container.registerSingleton(TOKENS.McpHttpServer, McpHttpServer);
  
  console.log("API components registered");
}
