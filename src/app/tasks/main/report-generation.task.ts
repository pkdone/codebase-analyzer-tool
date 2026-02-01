import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Task } from "../task.types";
import { coreTokens } from "../../di/tokens";
import { reportingTokens } from "../../di/tokens";
import { outputConfig } from "../../config/output.config";
import { clearDirectory } from "../../../common/fs/directory-operations";
import ReportArtifactGenerator from "../../components/reporting/report-artifact-generator";

/**
 * Task to generate report artifacts for an application's composition.
 */
@injectable()
export class ReportGenerationTask implements Task {
  /**
   * Constructor with dependency injection.
   */
  constructor(
    @inject(coreTokens.ProjectName) private readonly projectName: string,
    @inject(reportingTokens.ReportArtifactGenerator)
    private readonly reportArtifactGenerator: ReportArtifactGenerator,
  ) {}

  /**
   * Execute the service - generates report artifacts for the codebase.
   */
  async execute(): Promise<void> {
    await this.generateReportArtifacts();
  }

  /**
   * Generate report artifacts from the codebase in the specified directory.
   */
  private async generateReportArtifacts(): Promise<void> {
    await clearDirectory(outputConfig.OUTPUT_DIR);
    console.log(`Creating report artifacts for project: ${this.projectName}`);
    await this.reportArtifactGenerator.generateReportArtifacts(
      this.projectName,
      outputConfig.OUTPUT_DIR,
      outputConfig.OUTPUT_SUMMARY_HTML_FILE,
    );
  }
}
