import "reflect-metadata";
import { Task } from "../tasks/task.types";
import { container } from "../di/container";
import { TOKENS } from "../di/tokens";
import { ShutdownService } from "./shutdown-service";
import { formatDateForLogging } from "../common/utils/date-utils";

/**
 * Generic task runner function that handles task execution:
 * 1. Resolve and execute task using DI container (task dependencies are injected automatically)
 * 2. Handle graceful shutdown for any registered services that need cleanup
 *
 * Note: This function assumes the DI container has already been bootstrapped with async factories.
 * Use bootstrapContainer() before calling this function.
 */
export async function runTask(taskToken: symbol): Promise<void> {
  try {
    console.log(`START: ${formatDateForLogging()}`);

    // Resolve task (await handles both sync and async resolution)
    // Task dependencies are automatically injected via constructor DI
    const task = await container.resolve<Task | Promise<Task>>(taskToken);

    try {
      await task.execute();
    } catch (error: unknown) {
      if (error instanceof TypeError && error.message.includes("execute")) {
        throw new Error(
          `Task for token '${taskToken.toString()}' could not be resolved or does not have a valid execute method.`,
        );
      }
      throw error;
    }
  } finally {
    console.log(`END: ${formatDateForLogging()}`);

    // Resolve and use shutdown service from DI container
    try {
      const shutdownService = container.resolve<ShutdownService>(TOKENS.ShutdownService);
      await shutdownService.shutdownWithForcedExitFallback();
    } catch (error) {
      console.error("Failed to perform graceful shutdown:", error);
    }
  }
}
