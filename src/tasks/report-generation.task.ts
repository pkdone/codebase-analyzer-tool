import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Task } from "./task.types";
import { coreTokens } from "../di/tokens";
import { reportingTokens } from "../di/tokens";
import { outputConfig } from "../config/output.config";
import { clearDirectory } from "../common/fs/directory-operations";
import AppReportGenerator from "../components/reporting/app-report-generator";

/**
 * Task to generate a report of an application's composition.
 */
@injectable()
export class ReportGenerationTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(coreTokens.ProjectName) private readonly projectName: string,
    @inject(reportingTokens.AppReportGenerator)
    private readonly appReportGenerator: AppReportGenerator,
  ) {}

  /**
   * Execute the service - generates a report for the codebase.
   */
  async execute(): Promise<void> {
    await this.generateReport();
  }

  /**
   * Generate a report from the codebase in the specified directory.
   */
  private async generateReport(): Promise<void> {
    await clearDirectory(outputConfig.OUTPUT_DIR);
    console.log(`Creating report for project: ${this.projectName}`);
    await this.appReportGenerator.generateReport(
      this.projectName,
      outputConfig.OUTPUT_DIR,
      outputConfig.OUTPUT_SUMMARY_HTML_FILE,
    );
  }
}
