import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import McpHttpServer from "../components/api/mcpServing/mcp-http-server";
import { Service } from "../lifecycle/service.types";
import { TOKENS } from "../di/tokens";

/**
 * Service to run the MCP insights server.
 */
@injectable()
export class McpServerService implements Service {
  private shutdownResolve?: () => void;

  /**
   * Constructor with dependency injection.
   */
  constructor(@inject(TOKENS.McpHttpServer) private readonly mcpHttpServer: McpHttpServer) {}

  /**
   * Execute the service - starts the MCP insights server and keeps it running.
   */
  async execute(): Promise<void> {
    // Start the server
    await this.mcpHttpServer.start();

    // Create a promise that only resolves when shutdown is requested
    // This keeps the service alive until explicitly stopped
    return new Promise<void>((resolve) => {
      this.shutdownResolve = resolve;

      // Set up process signal handlers for graceful shutdown
      const handleShutdown = () => {
        console.log("Received shutdown signal, stopping MCP server...");
        void this.stopService();
      };

      process.on("SIGINT", handleShutdown);
      process.on("SIGTERM", handleShutdown);
    });
  }

  /**
   * Stop the service gracefully.
   */
  private async stopService(): Promise<void> {
    try {
      await this.mcpHttpServer.stop();
      console.log("MCP server stopped successfully");
    } catch (error) {
      console.error("Error stopping MCP server:", error);
    } finally {
      // Resolve the promise to complete the service execution
      if (this.shutdownResolve) {
        this.shutdownResolve();
      }
    }
  }
}
