import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Service } from "../lifecycle/service.types";
import type { EnvVars } from "../lifecycle/env.types";
import { TOKENS } from "../di/tokens";
import { appConfig } from "../config/app.config";
import { clearDirectory, writeFile } from "../common/utils/fs-utils";
import path from "path";
import AppReportGenerator from "../components/reporting/app-report-generator";

/**
 * Service to generate a report of an application's composition.
 */
@injectable()
export class ReportGenerationService implements Service {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(TOKENS.EnvVars) private readonly env: EnvVars,
    @inject(TOKENS.ProjectName) private readonly projectName: string,
    @inject(TOKENS.AppReportGenerator) private readonly appReportGenerator: AppReportGenerator,
  ) {}

  /**
   * Execute the service - generates a report for the codebase.
   */
  async execute(): Promise<void> {
    await this.generateReport(this.env.CODEBASE_DIR_PATH);
  }

  /**
   * Generate a report from the codebase in the specified directory.
   */
  private async generateReport(srcDirPath: string): Promise<void> {
    console.log(`ReportGenerationService: Generating report for source directory: ${srcDirPath}`);
    const cleanSrcDirPath = srcDirPath.replace(appConfig.TRAILING_SLASH_PATTERN, "");
    console.log(cleanSrcDirPath);
    await clearDirectory(appConfig.OUTPUT_DIR);
    console.log(`Creating report for project: ${this.projectName}`);

    // Generate HTML report (also generates JSON files for each category)
    const htmlFilePath = path.join(appConfig.OUTPUT_DIR, appConfig.OUTPUT_SUMMARY_HTML_FILE);
    await writeFile(
      htmlFilePath,
      await this.appReportGenerator.generateHTMLReport(this.projectName),
    );

    console.log(`View generated report in a browser: file://${path.resolve(htmlFilePath)}`);
  }
}
