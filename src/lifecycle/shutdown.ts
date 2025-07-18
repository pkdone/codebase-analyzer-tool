import LLMRouter from "../llm/core/llm-router";
import { MongoDBClientFactory } from "../common/mdb/mdb-client-factory";
import { llmConfig } from "../llm/llm.config";

/**
 * Gracefully shutdown LLM connections and MongoDB connections with provider-specific cleanup handling.
 *
 * @param llmRouter The LLM router instance to close, or undefined if not initialized
 * @param mongoDBClientFactory The MongoDB client factory to close, or undefined if not initialized
 */
export async function gracefulShutdown(
  llmRouter?: LLMRouter,
  mongoDBClientFactory?: MongoDBClientFactory,
): Promise<void> {
  // Close LLM connections
  if (llmRouter) {
    await llmRouter.close();

    // Only apply Google Cloud specific workaround when using VertexAI
    if (llmRouter.getModelFamily() === llmConfig.PROBLEMATIC_SHUTDOWN_LLM_PROVIDER) {
      // Known Google Cloud Node.js client limitation:
      // VertexAI SDK doesn't have explicit close() method and HTTP connections may persist
      // This is documented behavior - see: https://github.com/googleapis/nodejs-pubsub/issues/1190
      // Use timeout-based cleanup as the recommended workaround
      void setTimeout(() => {
        console.log("Forced exit because GCP client connections caanot be closed properly");
        process.exit(0);
      }, 1000); // 1 second should be enough for any pending operations
    }
  }

  // Close MongoDB connections
  if (mongoDBClientFactory) {
    await mongoDBClientFactory.closeAll();
  }
}
