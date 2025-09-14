import LLMRouter from "../llm/core/llm-router";
import { MongoDBClientFactory } from "../common/mdb/mdb-client-factory";

/**
 * Service responsible for coordinating graceful shutdown of application components.
 * Accepts optional dependencies directly to perform shutdown operations.
 */
export class ShutdownService {
  constructor(
    private readonly llmRouter?: LLMRouter,
    private readonly mongoDBClientFactory?: MongoDBClientFactory,
  ) {}

  /**
   * Perform shutdown of all registered services with provider-specific handling.
   * This method handles LLM router shutdown, MongoDB connections cleanup,
   * and includes forced exit fallback for providers that cannot close cleanly.
   */
  async shutdownWithForcedExitFallback(): Promise<void> {
    // Close LLM connections if available
    if (this.llmRouter) {
      await this.llmRouter.close();

      // Check if the provider requires a forced shutdown
      if (this.llmRouter.providerNeedsForcedShutdown()) {
        // Known Google Cloud Node.js client limitation:
        // VertexAI SDK doesn't have explicit close() method and HTTP connections may persist
        // This is documented behavior - see: https://github.com/googleapis/nodejs-pubsub/issues/1190
        // Use timeout-based cleanup as the recommended workaround
        void setTimeout(() => {
          console.log("Forced exit because GCP client connections cannot be closed properly");
          process.exit(0);
        }, 1000); // 1 second should be enough for any pending operations
      }
    }

    // Close MongoDB connections if available
    if (this.mongoDBClientFactory) {
      await this.mongoDBClientFactory.closeAll();
    }
  }

}
