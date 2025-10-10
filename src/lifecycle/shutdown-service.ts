import "reflect-metadata";
import LLMRouter from "../llm/core/llm-router";
import { MongoDBClientFactory } from "../common/mdb/mdb-client-factory";
import { injectable } from "tsyringe";

/**
 * Service responsible for coordinating graceful shutdown of application components.
 * Dependencies are now injected via constructor for better testability.
 */
@injectable()
export class ShutdownService {
  constructor(
    private readonly llmRouter?: LLMRouter,
    private readonly mongoDBClientFactory?: MongoDBClientFactory,
  ) {}

  /**
   * Perform graceful shutdown of all registered services with provider-specific handling.
   * This method handles LLM router shutdown, MongoDB connections cleanup,
   * and includes forced exit fallback for providers that cannot close cleanly.
   */
  async gracefulShutdown(): Promise<void> {
    const shutdownPromises = [];
    if (this.llmRouter) shutdownPromises.push(this.llmRouter.close());
    if (this.mongoDBClientFactory) shutdownPromises.push(this.mongoDBClientFactory.closeAll());
    const results = await Promise.allSettled(shutdownPromises);
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("A shutdown operation failed:", result.reason);
      }
    }

    try {
      if (this.llmRouter?.providerNeedsForcedShutdown()) {
        // Known Google Cloud Node.js client limitation:
        // VertexAI SDK doesn't have explicit close() method and HTTP connections may persist
        // This is documented behavior - see: https://github.com/googleapis/nodejs-pubsub/issues/1190
        // Use timeout-based cleanup as the recommended workaround
        void setTimeout(() => {
          console.log("Forced exit because GCP client connections cannot be closed properly");
          process.exit(0);
        }, 1000); // 1 second should be enough for any pending operations
      }
    } catch (error: unknown) {
      console.error("Error during forced shutdown check:", error);
    }
  }
}
