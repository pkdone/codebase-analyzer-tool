import "reflect-metadata";
import { injectable, inject } from "tsyringe";
import { Task } from "../task.types";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";
import type { ProjectSummaryStats } from "../../repositories/sources/sources.model";
import { repositoryTokens, coreTokens } from "../../di/tokens";
import { logInfo, logOutput } from "../../../common/utils/logging";

const ACTIVE_MARKER = " -->";
const HEADERS = ["", "Project", "Files", "Lines of Code", "Summarized", "File Types"] as const;

/**
 * Task that lists all projects stored in the database along with summary statistics.
 * Queries the sources collection to show file count, lines of code,
 * summarization progress, and file types per project. The currently configured
 * project (from .env) is marked with an arrow indicator.
 */
@injectable()
export class ListProjectsTask implements Task {
  constructor(
    @inject(repositoryTokens.SourcesRepository)
    private readonly sourcesRepository: SourcesRepository,
    @inject(coreTokens.ProjectName)
    private readonly configuredProjectName: string,
  ) {}

  /**
   * Execute the task - queries the database for all projects and displays a summary table.
   */
  async execute(): Promise<void> {
    const projectStats = await this.sourcesRepository.getAllProjectStats();

    if (projectStats.length === 0) {
      logInfo("\nNo projects found in the database.\n");
      return;
    }

    const rows = projectStats.map((stats) => this.toRowCells(stats));
    this.printTable(rows, projectStats);
  }

  private toRowCells(stats: ProjectSummaryStats): string[] {
    const summarizedPct =
      stats.fileCount > 0 ? Math.round((stats.summarizedFileCount / stats.fileCount) * 100) : 0;
    const isActive = stats.projectName === this.configuredProjectName;

    return [
      isActive ? ACTIVE_MARKER : "",
      stats.projectName,
      String(stats.fileCount),
      String(stats.linesOfCode),
      `${stats.summarizedFileCount}/${stats.fileCount} (${summarizedPct}%)`,
      stats.fileExtensions.join(", "),
    ];
  }

  private printTable(rows: string[][], stats: ProjectSummaryStats[]): void {
    const totalFiles = stats.reduce((sum, s) => sum + s.fileCount, 0);
    const totalLines = stats.reduce((sum, s) => sum + s.linesOfCode, 0);

    const colWidths = HEADERS.map((header, col) => {
      const dataMax = Math.max(...rows.map((row) => row[col].length));
      return Math.max(header.length, dataMax);
    });

    const formatRow = (cells: readonly string[]) =>
      cells.map((cell, i) => cell.padEnd(colWidths[i])).join("  ");

    const headerLine = formatRow(HEADERS);
    const separator = colWidths.map((w) => "-".repeat(w)).join("  ");

    logInfo("");
    logOutput("Projects In Database");
    logOutput(separator);
    logOutput(headerLine);
    logOutput(separator);

    for (const row of rows) {
      logOutput(formatRow(row));
    }

    logOutput(separator);
    logOutput(`Total: ${stats.length} project(s), ${totalFiles} files, ${totalLines} lines`);
    logOutput(`--> = configured project (from .env)`);
    logOutput("");
  }
}
