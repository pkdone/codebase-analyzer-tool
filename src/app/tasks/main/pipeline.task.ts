import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Task } from "../task.types";
import { taskTokens } from "../../di/tokens";
import type { CodebaseCaptureTask } from "./codebase-capture.task";
import type { InsightsGenerationTask } from "./insights-generation.task";
import type { ReportGenerationTask } from "./report-generation.task";

/**
 * Task to run the full pipeline workflow: capture → insights → report.
 *
 * This task orchestrates all three main phases of the analysis workflow within a single
 * application lifecycle, ensuring that the shutdown phase only occurs once after all
 * phases complete. This is critical for LLM providers (like VertexAI) that require
 * forced process exits, as calling each phase separately would terminate the process
 * prematurely after the first phase.
 */
@injectable()
export class PipelineTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(taskTokens.CodebaseCaptureTask)
    private readonly captureTask: CodebaseCaptureTask,
    @inject(taskTokens.InsightsGenerationTask)
    private readonly insightsTask: InsightsGenerationTask,
    @inject(taskTokens.ReportGenerationTask)
    private readonly reportTask: ReportGenerationTask,
  ) {}

  /**
   * Execute the full pipeline workflow.
   * Runs capture, insights, and report generation in sequence.
   */
  async execute(): Promise<void> {
    console.log("========================================");
    console.log("Starting full pipeline workflow:");
    console.log("  1. Capture codebase metadata");
    console.log("  2. Generate insights");
    console.log("  3. Produce report");
    console.log("========================================");

    // Phase 1: Capture
    console.log("\n--- Phase 1/3: Capture ---");
    await this.captureTask.execute();

    // Phase 2: Insights
    console.log("\n--- Phase 2/3: Insights ---");
    await this.insightsTask.execute();

    // Phase 3: Report
    console.log("\n--- Phase 3/3: Report ---");
    await this.reportTask.execute();

    console.log("\n========================================");
    console.log("Pipeline workflow completed successfully");
    console.log("========================================");
  }
}
