import "reflect-metadata";
import { bootstrapContainer, container } from "../di/container";
import { getTaskConfiguration } from "../di/registration-modules/task-config-registration";
import { runTask } from "./task-executor";
import { ShutdownService } from "./shutdown-service";
import { TOKENS } from "../tokens";

/**
 * Main application entry point that orchestrates the application lifecycle:
 * 1. Bootstrap phase: Set up the DI container with required dependencies
 * 2. Run phase: Execute the specified task using the bootstrapped container
 * 3. Shutdown phase: Gracefully close all registered services
 *
 * This function handles all error cases and process termination internally.
 */
export function bootstrapAndRunTask(taskToken: symbol): void {
  const eventLoopKeepAliveInterval = setInterval(() => {
    // Prevent process from exiting prematurely by keeping the event loop active
    // See the comment in the finally block below
  }, 30000); // Empty timer every 30 seconds

  void (async () => {
    try {
      const config = getTaskConfiguration(taskToken);
      await bootstrapContainer(config);
      await runTask(taskToken);
    } catch (error: unknown) {
      console.error("Application error:", error);
      process.exitCode = 1;
    } finally {
      // Gracefully shutdown all registered services
      try {
        if (container.isRegistered(TOKENS.ShutdownService)) {
          const shutdownService = container.resolve<ShutdownService>(TOKENS.ShutdownService);
          await shutdownService.gracefulShutdown();
        }
      } catch (shutdownError: unknown) {
        console.error("Failed to perform graceful shutdown:", shutdownError);
      }

      // Known Node.js + AWS SDK pattern - many AWS SDK applications need this keep-alive pattern to
      // prevent premature termination during long-running cloud operations
      clearInterval(eventLoopKeepAliveInterval);
    }
  })();
}
