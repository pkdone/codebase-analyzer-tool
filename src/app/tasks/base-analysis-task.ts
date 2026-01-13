import "reflect-metadata";
import type LLMExecutionStats from "../../common/llm/tracking/llm-execution-stats";
import type { Task } from "./task.types";
import { outputConfig } from "../config/output.config";
import { clearDirectory } from "../../common/fs/directory-operations";

/**
 * Abstract base class for analysis tasks that use LLM services.
 *
 * This class implements the template method pattern for tasks that:
 * 1. Log a start message
 * 2. Display LLM status summary
 * 3. Clear the output directory (optional, controlled by shouldClearOutputDirectory())
 * 4. Run the task-specific logic
 * 5. Log a finish message
 * 6. Display LLM status details
 *
 * Subclasses must implement:
 * - `getStartMessage()`: Returns the start message (e.g., "Processing source files for project")
 * - `getFinishMessage()`: Returns the finish message (e.g., "Finished processing source files")
 * - `runTask()`: Contains the task-specific logic
 *
 * Optionally, subclasses can override:
 * - `getPostTaskMessage()`: Returns an additional message to log after stats (default: null)
 * - `shouldClearOutputDirectory()`: Whether to clear output directory before task (default: true)
 */
export abstract class BaseAnalysisTask implements Task {
  constructor(
    protected readonly llmStats: LLMExecutionStats,
    protected readonly projectName: string,
  ) {}

  /**
   * Execute the task with standard LLM stats reporting wrapper.
   * This is the template method that orchestrates the common lifecycle.
   */
  async execute(): Promise<void> {
    console.log(`${this.getStartMessage()}: ${this.projectName}`);
    this.llmStats.displayLLMStatusSummary();
    if (this.shouldClearOutputDirectory()) {
      await clearDirectory(outputConfig.OUTPUT_DIR);
    }
    await this.runTask();
    console.log(this.getFinishMessage());
    console.log("Summary of LLM invocations outcomes:");
    this.llmStats.displayLLMStatusDetails();
    const postMessage = this.getPostTaskMessage();
    if (postMessage) console.log(postMessage);
  }

  /**
   * Returns whether the output directory should be cleared before running the task.
   * Override this in subclasses that don't generate output files (e.g., query tasks).
   * @returns true to clear the output directory, false to skip clearing
   */
  protected shouldClearOutputDirectory(): boolean {
    return true;
  }

  /**
   * Returns an optional message to log after displaying stats.
   * Override this in subclasses that need additional post-execution output.
   * @returns The message to log, or null for no additional output
   */
  protected getPostTaskMessage(): string | null {
    return null;
  }

  /**
   * Returns the message to log at the start of execution.
   * @example "Processing source files for project"
   */
  protected abstract getStartMessage(): string;

  /**
   * Returns the message to log when execution finishes.
   * @example "Finished processing source files for the project"
   */
  protected abstract getFinishMessage(): string;

  /**
   * Contains the task-specific logic.
   * Called between the start logging and finish logging.
   */
  protected abstract runTask(): Promise<void>;
}
