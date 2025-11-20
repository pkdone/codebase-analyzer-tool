/**
 * Base interface that all tasks must implement.
 */
export interface Task {
  /**
   * Execute the main functionality of the task.
   */
  execute(): Promise<void>;
}
