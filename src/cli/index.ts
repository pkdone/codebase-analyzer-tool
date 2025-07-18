import "reflect-metadata";
import { bootstrapContainer } from "../di/container";
import { runService } from "../lifecycle/service-runner";
import { getServiceConfiguration } from "../di/registration-modules/service-config-registration";

/**
 * Main application entry point that orchestrates the two distinct phases:
 * 1. Bootstrap phase: Set up the DI container with required dependencies
 * 2. Run phase: Execute the specified service using the bootstrapped container
 */
export async function runApplication(serviceToken: symbol): Promise<void> {
  const keepAlive = setInterval(() => {
    // Prevent process from exiting prematurely by keeping the event loop active
    // See comment in finally block below
  }, 30000); // Empty timer every 30 seconds

  try {
    const config = getServiceConfiguration(serviceToken);
    await bootstrapContainer(config);
    await runService(serviceToken);
  } catch (error) {
    console.error("Application error:", error);
    process.exitCode = 1;
  } finally {
    // Known Node.js + AWS SDK pattern - many AWS SDK applications need this keep-alive pattern to
    // prevent premature termination during long-running cloud operations
    clearInterval(keepAlive);
    process.exit();
  }
}
