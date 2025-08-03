import "reflect-metadata";
import { bootstrapContainer } from "../di/container";
import { getTaskConfiguration } from "../di/registration-modules/task-config-registration";
import { runTask } from "./task-executor";

/**
 * Main application entry point that orchestrates the two distinct phases:
 * 1. Bootstrap phase: Set up the DI container with required dependencies
 * 2. Run phase: Execute the specified task using the bootstrapped container
 */
export async function runApplication(taskToken: symbol): Promise<void> {
  const eventLoopKeepAliveInterval = setInterval(() => {
    // Prevent process from exiting prematurely by keeping the event loop active
    // See the comment in the finally block below
  }, 30000); // Empty timer every 30 seconds

  try {
    const config = getTaskConfiguration(taskToken);
    await bootstrapContainer(config);
    await runTask(taskToken);
  } catch (error: unknown) {
    console.error("Application error:", error);
    process.exitCode = 1;
  } finally {
    // Known Node.js + AWS SDK pattern - many AWS SDK applications need this keep-alive pattern to
    // prevent premature termination during long-running cloud operations
    clearInterval(eventLoopKeepAliveInterval);
  }
}
