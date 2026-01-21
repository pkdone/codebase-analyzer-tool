import "reflect-metadata";
import { bootstrapContainer, container } from "../di/container";
import { Task } from "../tasks/task.types";
import { formatDateForLogging } from "../../common/utils/date-utils";
import { coreTokens, llmTokens } from "../di/tokens";
import type { MongoDBConnectionManager } from "../../common/mongodb/mdb-connection-manager";
import type LLMRouter from "../../common/llm/llm-router";

/**
 * Simplified application entry point that orchestrates the application lifecycle:
 * 1. Bootstrap phase: Set up the DI container with required dependencies
 * 2. Run phase: Execute the specified task using the bootstrapped container
 * 3. Shutdown phase: Gracefully close all registered services
 *
 * This function handles all error cases and process termination internally.
 */
export async function runApplication(taskToken: symbol): Promise<void> {
  const keepAliveInterval = setInterval(() => {
    // Prevent process from exiting prematurely by keeping the event loop active
    // See the comment in the finally block below
  }, 30000); // Empty timer every 30 seconds

  try {
    // Bootstrap the DI container
    await bootstrapContainer();

    // Resolve and execute the task
    console.log(`START: ${formatDateForLogging()}`);
    const task = await container.resolve<Task | Promise<Task>>(taskToken);
    await task.execute();
    console.log(`END: ${formatDateForLogging()}`);
  } catch (error: unknown) {
    console.error("Application error:", error);
    process.exitCode = 1;
  } finally {
    // Gracefully shutdown all registered services
    try {
      // Directly resolve and shutdown MongoDB and LLM components
      if (container.isRegistered(coreTokens.MongoDBConnectionManager)) {
        const mongoConnectionManager = container.resolve<MongoDBConnectionManager>(
          coreTokens.MongoDBConnectionManager,
        );
        await mongoConnectionManager.shutdown();
      }
      if (container.isRegistered(llmTokens.LLMRouter)) {
        const llmRouter = container.resolve<LLMRouter>(llmTokens.LLMRouter);

        // Check shutdown behavior BEFORE shutdown (shutdown clears the provider cache,
        // and getProvidersRequiringProcessExit() would re-instantiate providers if called after)
        const providersRequiringExit = llmRouter.getProvidersRequiringProcessExit();

        await llmRouter.shutdown();

        // Known Google Cloud Node.js client limitation:
        // VertexAI SDK doesn't have explicit close() method and HTTP connections may persist
        // This is documented behavior - see: https://github.com/googleapis/nodejs-pubsub/issues/1190
        if (providersRequiringExit.length > 0) {
          const providerNames = providersRequiringExit.join(", ");
          console.log(
            `LLM provider(s) require forced exit (${providerNames}) - terminating process`,
          );
          process.exit(0);
        }
      }
    } catch (shutdownError: unknown) {
      console.error("Failed to perform graceful shutdown:", shutdownError);
    }

    // Known Node.js + AWS SDK pattern - many AWS SDK applications need this keep-alive pattern to
    // prevent premature termination during long-running cloud operations
    clearInterval(keepAliveInterval);
  }
}
