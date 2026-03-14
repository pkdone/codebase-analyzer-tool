import "reflect-metadata";
import { bootstrapContainer, container } from "../di/container";
import { Task } from "../tasks/task.types";
import { formatDateForLogging } from "../../common/utils/date-utils";
import { logErr, logInfo } from "../../common/utils/logging";
import { createShutdownOrchestrator } from "./shutdown-orchestrator";

/**
 * Simplified application entry point that orchestrates the application lifecycle:
 * 1. Bootstrap phase: Set up the DI container with required dependencies
 * 2. Run phase: Execute the specified task using the bootstrapped container
 * 3. Shutdown phase: Gracefully close all registered services
 *
 * This function handles all error cases and process termination internally.
 */
export async function runApplication(
  taskToken: symbol,
  configureTask?: (task: Task) => void,
): Promise<void> {
  // Known Node.js + AWS SDK pattern - many AWS SDK applications need this keep-alive pattern to
  // prevent premature termination during long-running cloud operations.
  // See: https://github.com/aws/aws-sdk-js-v3/issues/3807
  const keepAliveInterval = setInterval(() => {
    // Prevent process from exiting prematurely by keeping the event loop active
  }, 30000);

  try {
    await bootstrapContainer();
    logInfo(`START: ${formatDateForLogging()}`);
    const task = await container.resolve<Task | Promise<Task>>(taskToken);
    configureTask?.(task);
    await task.execute();
    logInfo(`END: ${formatDateForLogging()}`);
  } catch (error: unknown) {
    logErr("Application error", error);
    process.exitCode = 1;
  } finally {
    try {
      const shutdownOrchestrator = createShutdownOrchestrator(container);
      const result = await shutdownOrchestrator.shutdown();

      // Some providers (e.g., VertexAI) don't properly release their HTTP connections,
      // requiring a forced process exit to prevent the process from hanging indefinitely.
      // See: https://github.com/googleapis/nodejs-pubsub/issues/1190
      if (result.requiresForcedExit) {
        const providerNames = result.providersRequiringExit.join(", ");
        logInfo(`LLM provider(s) require forced exit (${providerNames}) - terminating process`);
        process.exit(process.exitCode ?? 0);
      }
    } catch (shutdownError: unknown) {
      logErr("Failed to perform graceful shutdown", shutdownError);
    }

    clearInterval(keepAliveInterval);
  }
}
