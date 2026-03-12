import "reflect-metadata";
import { ListProjectsTask } from "../../../../src/app/tasks/dev/list-projects.task";
import type { SourcesRepository } from "../../../../src/app/repositories/sources/sources.repository.interface";
import type { ProjectSummaryStats } from "../../../../src/app/repositories/sources/sources.model";

const CONFIGURED_PROJECT = "my-app";

describe("ListProjectsTask", () => {
  let task: ListProjectsTask;
  let mockSourcesRepository: jest.Mocked<Pick<SourcesRepository, "getAllProjectStats">>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSourcesRepository = {
      getAllProjectStats: jest.fn(),
    };
    task = new ListProjectsTask(
      mockSourcesRepository as unknown as SourcesRepository,
      CONFIGURED_PROJECT,
    );
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should display 'no projects' message when database is empty", async () => {
    mockSourcesRepository.getAllProjectStats.mockResolvedValue([]);

    await task.execute();

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("No projects found"));
    expect(consoleSpy).not.toHaveBeenCalledWith("Projects In Database");
  });

  it("should display project data when projects exist", async () => {
    const stats: ProjectSummaryStats[] = [
      {
        projectName: "my-app",
        fileCount: 50,
        linesOfCode: 5000,
        fileExtensions: [".java", ".xml"],
        hasSummaries: true,
        summarizedFileCount: 45,
      },
    ];
    mockSourcesRepository.getAllProjectStats.mockResolvedValue(stats);

    await task.execute();

    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join("\n");
    expect(output).toContain("Projects In Database");
    expect(output).toContain("my-app");
    expect(output).toContain("50");
    expect(output).toContain("5000");
    expect(output).toContain("45/50 (90%)");
    expect(output).toContain(".java, .xml");
    expect(output).toContain("Total: 1 project(s), 50 files, 5000 lines");
    expect(output).toContain("--> = configured project (from .env)");
  });

  it("should mark only the configured project with the arrow indicator", async () => {
    const stats: ProjectSummaryStats[] = [
      {
        projectName: "my-app",
        fileCount: 50,
        linesOfCode: 5000,
        fileExtensions: [".ts"],
        hasSummaries: true,
        summarizedFileCount: 50,
      },
      {
        projectName: "other-app",
        fileCount: 30,
        linesOfCode: 2000,
        fileExtensions: [".py"],
        hasSummaries: false,
        summarizedFileCount: 0,
      },
    ];
    mockSourcesRepository.getAllProjectStats.mockResolvedValue(stats);

    await task.execute();

    const dataLines = consoleSpy.mock.calls
      .map((c: unknown[]) => c[0] as string)
      .filter((line: string) => line.includes("my-app") || line.includes("other-app"));

    const activeRow = dataLines.find((line: string) => line.includes("my-app"));
    const inactiveRow = dataLines.find((line: string) => line.includes("other-app"));
    expect(activeRow).toContain("-->");
    expect(inactiveRow).not.toContain("-->");
  });

  it("should display totals for multiple projects", async () => {
    const stats: ProjectSummaryStats[] = [
      {
        projectName: "app-a",
        fileCount: 100,
        linesOfCode: 10000,
        fileExtensions: [".ts"],
        hasSummaries: true,
        summarizedFileCount: 100,
      },
      {
        projectName: "app-b",
        fileCount: 50,
        linesOfCode: 3000,
        fileExtensions: [".py"],
        hasSummaries: false,
        summarizedFileCount: 0,
      },
    ];
    mockSourcesRepository.getAllProjectStats.mockResolvedValue(stats);

    await task.execute();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Total: 2 project(s), 150 files, 13000 lines"),
    );
  });

  it("should show 0% summarized when no files have summaries", async () => {
    const stats: ProjectSummaryStats[] = [
      {
        projectName: "new-project",
        fileCount: 30,
        linesOfCode: 2000,
        fileExtensions: [".js"],
        hasSummaries: false,
        summarizedFileCount: 0,
      },
    ];
    mockSourcesRepository.getAllProjectStats.mockResolvedValue(stats);

    await task.execute();

    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join("\n");
    expect(output).toContain("0/30 (0%)");
  });

  it("should handle project with zero files gracefully", async () => {
    const stats: ProjectSummaryStats[] = [
      {
        projectName: "empty-project",
        fileCount: 0,
        linesOfCode: 0,
        fileExtensions: [],
        hasSummaries: false,
        summarizedFileCount: 0,
      },
    ];
    mockSourcesRepository.getAllProjectStats.mockResolvedValue(stats);

    await task.execute();

    const output = consoleSpy.mock.calls.map((c: unknown[]) => c[0]).join("\n");
    expect(output).toContain("empty-project");
    expect(output).toContain("0/0 (0%)");
  });
});
