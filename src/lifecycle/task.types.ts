/**
 * Base interface that all tasks must implement.
 */
export interface Task {
  /**
   * Execute the main functionality of the task.
   */
  execute(): Promise<void>;
}

/**
 * Configuration for the task runner.
 */
export interface TaskRunnerConfig {
  /** Whether this task requires MongoDB client */
  requiresMongoDB: boolean;
  /** Whether this task requires LLM router */
  requiresLLM: boolean;
}
