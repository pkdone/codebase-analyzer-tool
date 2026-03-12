import "reflect-metadata";
import { DeleteProjectTask } from "../../../../src/app/tasks/dev/delete-project.task";
import type { SourcesRepository } from "../../../../src/app/repositories/sources/sources.repository.interface";
import type { AppSummariesRepository } from "../../../../src/app/repositories/app-summaries/app-summaries.repository.interface";

describe("DeleteProjectTask", () => {
  let task: DeleteProjectTask;
  let mockSourcesRepo: jest.Mocked<Pick<SourcesRepository, "deleteSourcesByProject">>;
  let mockSummariesRepo: jest.Mocked<Pick<AppSummariesRepository, "deleteAppSummaryByProject">>;
  let consoleSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    mockSourcesRepo = { deleteSourcesByProject: jest.fn().mockResolvedValue(undefined) };
    mockSummariesRepo = { deleteAppSummaryByProject: jest.fn().mockResolvedValue(undefined) };
    task = new DeleteProjectTask(
      mockSourcesRepo as unknown as SourcesRepository,
      mockSummariesRepo as unknown as AppSummariesRepository,
    );
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    process.exitCode = undefined;
  });

  it("should delete sources and app summaries for the specified project", async () => {
    task.targetProjectName = "my-app";

    await task.execute();

    expect(mockSourcesRepo.deleteSourcesByProject).toHaveBeenCalledWith("my-app");
    expect(mockSummariesRepo.deleteAppSummaryByProject).toHaveBeenCalledWith("my-app");
  });

  it("should delete from both collections in parallel", async () => {
    task.targetProjectName = "my-app";
    let sourcesResolved = false;
    let summariesResolved = false;

    mockSourcesRepo.deleteSourcesByProject.mockImplementation(async () => {
      sourcesResolved = true;
      expect(summariesResolved).toBe(false);
    });
    mockSummariesRepo.deleteAppSummaryByProject.mockImplementation(async () => {
      summariesResolved = true;
    });

    await task.execute();

    expect(sourcesResolved).toBe(true);
    expect(summariesResolved).toBe(true);
  });

  it("should log success message after deletion", async () => {
    task.targetProjectName = "legacy-app";

    await task.execute();

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('"legacy-app" has been deleted'),
    );
  });

  it("should set exitCode and log error when no project name is specified", async () => {
    task.targetProjectName = "";

    await task.execute();

    expect(process.exitCode).toBe(1);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining("No project name specified"),
    );
    expect(mockSourcesRepo.deleteSourcesByProject).not.toHaveBeenCalled();
    expect(mockSummariesRepo.deleteAppSummaryByProject).not.toHaveBeenCalled();
  });
});
