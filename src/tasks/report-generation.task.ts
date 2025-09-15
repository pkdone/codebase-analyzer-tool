import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Task } from "./task.types";
import { TOKENS } from "../di/tokens";
import { appConfig } from "../config/app.config";
import { clearDirectory } from "../common/utils/fs-utils";
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
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.AppReportGenerator) private readonly appReportGenerator: AppReportGenerator,
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
    console.log(`ReportGenerationTask: Generating report for project: ${this.projectName}`);
    await clearDirectory(appConfig.OUTPUT_DIR);
    console.log(`Creating report for project: ${this.projectName}`);
    await this.appReportGenerator.generateReport(
      this.projectName,
      appConfig.OUTPUT_DIR,
      appConfig.OUTPUT_SUMMARY_HTML_FILE,
    );
  }
}
