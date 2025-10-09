import "reflect-metadata";
import { Task } from "../tasks/task.types";
import { container } from "../di/container";
import { formatDateForLogging } from "../common/utils/date-utils";

/**
 * Generic task runner function that handles task execution:
 * 1. Resolve and execute task using DI container (task dependencies are injected automatically)
 *
 * Note: This function assumes the DI container has already been bootstrapped with async factories.
 * Use bootstrapContainer() before calling this function.
 * Graceful shutdown is handled at the application level in application-runner.ts.
 */
export async function runTask(taskToken: symbol): Promise<void> {
  console.log(`START: ${formatDateForLogging()}`);
  const task = await container.resolve<Task | Promise<Task>>(taskToken);
  await task.execute();
  console.log(`END: ${formatDateForLogging()}`);
}
