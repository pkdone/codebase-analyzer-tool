import "reflect-metadata";
import { inject } from "tsyringe";
import type { LLMStatsReporter } from "../llm/core/tracking/llm-stats-reporter";
import { Task } from "./task.types";
import { TOKENS } from "../tokens";

/**
 * Abstract base class for tasks that use LLM and require stats reporting.
 * Provides common logging and stats reporting functionality to eliminate boilerplate.
 */
export abstract class BaseLLMTask implements Task {
  constructor(
    @inject(TOKENS.LLMStatsReporter) protected readonly llmStatsReporter: LLMStatsReporter,
    @inject(TOKENS.ProjectName) protected readonly projectName: string,
  ) {}

  /**
   * Execute the task with standard LLM stats reporting wrapper.
   */
  async execute(): Promise<void> {
    console.log(`${this.getActivityDescription()} for project: ${this.projectName}`);
    this.llmStatsReporter.displayLLMStatusSummary();
    await this.run();
    console.log(`Finished ${this.getActivityDescription().toLowerCase()} for the project`);
    console.log("Summary of LLM invocations outcomes:");
    this.llmStatsReporter.displayLLMStatusDetails();
  }

  /**
   * The main task logic to be implemented by subclasses.
   */
  protected abstract run(): Promise<void>;

  /**
   * Get the activity description for logging. Should be in present participle form (e.g., "Generating insights").
   */
  protected abstract getActivityDescription(): string;
}
