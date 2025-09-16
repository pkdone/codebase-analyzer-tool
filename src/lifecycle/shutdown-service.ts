import "reflect-metadata";
import LLMRouter from "../llm/core/llm-router";
import { MongoDBClientFactory } from "../common/mdb/mdb-client-factory";
import { injectable, container } from "tsyringe";
import { TOKENS } from "../di/tokens";

/**
 * Service responsible for coordinating graceful shutdown of application components.
 * Uses constructor injection for dependencies but handles optional dependencies safely.
 */
@injectable()
export class ShutdownService {
  private readonly llmRouter?: LLMRouter;
  private readonly mongoDBClientFactory?: MongoDBClientFactory;

  constructor() {
    // Safely resolve optional dependencies from container
    this.llmRouter = container.isRegistered(TOKENS.LLMRouter)
      ? container.resolve<LLMRouter>(TOKENS.LLMRouter)
      : undefined;

    this.mongoDBClientFactory = container.isRegistered(TOKENS.MongoDBClientFactory)
      ? container.resolve<MongoDBClientFactory>(TOKENS.MongoDBClientFactory)
      : undefined;
  }

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
    results.forEach((result) => {
      if (result.status === "rejected") {
        console.error("A shutdown operation failed:", result.reason);
      }
    });

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
  }
}
