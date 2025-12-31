import "reflect-metadata";
import type LLMStats from "../../common/llm/tracking/llm-stats";
import type { Task } from "./task.types";
import { outputConfig } from "../components/reporting/config/output.config";
import { clearDirectory } from "../../common/fs/directory-operations";

/**
 * Abstract base class for analysis tasks that follow the standard lifecycle pattern.
 *
 * This class implements the template method pattern for tasks that:
 * 1. Log a start message
 * 2. Display LLM status summary
 * 3. Clear the output directory
 * 4. Run the analysis-specific logic
 * 5. Log a finish message
 * 6. Display LLM status details
 *
 * Subclasses must implement:
 * - `getStartMessage()`: Returns the start message (e.g., "Processing source files for project")
 * - `getFinishMessage()`: Returns the finish message (e.g., "Finished processing source files")
 * - `runAnalysis()`: Contains the task-specific analysis logic
 *
 * Optionally, subclasses can override:
 * - `getPostAnalysisMessage()`: Returns an additional message to log after stats (default: null)
 */
export abstract class BaseAnalysisTask implements Task {
  constructor(
    protected readonly llmStats: LLMStats,
    protected readonly projectName: string,
  ) {}

  /**
   * Execute the task with standard LLM stats reporting wrapper.
   * This is the template method that orchestrates the common lifecycle.
   */
  async execute(): Promise<void> {
    console.log(`${this.getStartMessage()}: ${this.projectName}`);
    this.llmStats.displayLLMStatusSummary();
    await clearDirectory(outputConfig.OUTPUT_DIR);
    await this.runAnalysis();
    console.log(this.getFinishMessage());
    console.log("Summary of LLM invocations outcomes:");
    this.llmStats.displayLLMStatusDetails();
    const postMessage = this.getPostAnalysisMessage();
    if (postMessage) console.log(postMessage);
  }

  /**
   * Returns an optional message to log after displaying stats.
   * Override this in subclasses that need additional post-execution output.
   * @returns The message to log, or null for no additional output
   */
  protected getPostAnalysisMessage(): string | null {
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
   * Contains the task-specific analysis logic.
   * Called between the start logging and finish logging.
   */
  protected abstract runAnalysis(): Promise<void>;
}
