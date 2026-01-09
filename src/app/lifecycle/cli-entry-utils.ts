import { runApplication } from "./application-runner";

/**
 * Utility function to run a CLI application with a specific task token.
 * This centralizes the common pattern used across all CLI entry points,
 * eliminating duplication while preserving the ability to run individual
 * commands directly from the IDE's Run/Debug facility.
 *
 * @param taskToken - The DI token for the task to execute
 */
export function runCliTask(taskToken: symbol): void {
  void runApplication(taskToken);
}

