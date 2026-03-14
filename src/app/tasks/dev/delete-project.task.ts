import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Task } from "../task.types";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import type { AppSummariesRepository } from "../../repositories/app-summaries/app-summaries.repository.interface";
import { repositoryTokens } from "../../di/tokens";
import { logInfo, logOutputErr } from "../../../common/utils/logging";

/**
 * Task that deletes all data for a specified project from both the sources
 * and app-summaries collections. The target project name must be set via
 * the targetProjectName property before calling execute().
 */
@injectable()
export class DeleteProjectTask implements Task {
  /** The project name to delete, set by the CLI before execution. */
  targetProjectName = "";

  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(repositoryTokens.AppSummariesRepository)
    private readonly appSummariesRepository: AppSummariesRepository,
  ) {}

  /**
   * Execute the deletion of all project data from the database.
   */
  async execute(): Promise<void> {
    if (!this.targetProjectName) {
      logOutputErr("No project name specified. Usage: cba delete <project-name>");
      process.exitCode = 1;
      return;
    }

    logInfo(`Deleting all data for project: "${this.targetProjectName}"...`);

    await Promise.all([
      this.sourcesRepository.deleteSourcesByProject(this.targetProjectName),
      this.appSummariesRepository.deleteAppSummaryByProject(this.targetProjectName),
    ]);

    logInfo(`Project "${this.targetProjectName}" has been deleted from the database.`);
  }
}
