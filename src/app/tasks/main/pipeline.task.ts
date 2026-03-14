import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Task } from "../task.types";
import { taskTokens } from "../../di/tokens";
import type { CodebaseCaptureTask } from "./codebase-capture.task";
import type { InsightsGenerationTask } from "./insights-generation.task";
import type { ReportGenerationTask } from "./report-generation.task";
import { logInfo, logOutput } from "../../../common/utils/logging";

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
    logInfo("========================================");
    logOutput("Starting full pipeline workflow:");
    logOutput("  1. Capture codebase metadata");
    logOutput("  2. Generate insights");
    logOutput("  3. Produce report");
    logOutput("========================================");

    // Phase 1: Capture
    logInfo("\n--- Phase 1/3: Capture ---");
    await this.captureTask.execute();

    // Phase 2: Insights
    logInfo("\n--- Phase 2/3: Insights ---");
    await this.insightsTask.execute();

    // Phase 3: Report
    logInfo("\n--- Phase 3/3: Report ---");
    await this.reportTask.execute();

    logInfo("\n========================================");
    logOutput("Pipeline workflow completed successfully");
    logOutput("========================================");
  }
}
