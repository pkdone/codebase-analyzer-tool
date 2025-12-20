import "reflect-metadata";
import { FileBasedInsightsGenerationTask } from "../../../../src/app/tasks/main/direct-insights-generation.task";
import { taskTokens } from "../../../../src/app/di/tokens";

describe("FileBasedInsightsGenerationTask", () => {
  it("should be importable with the correct name", () => {
    expect(FileBasedInsightsGenerationTask).toBeDefined();
    expect(typeof FileBasedInsightsGenerationTask).toBe("function");
  });

  it("should have the correct token registered in taskTokens", () => {
    expect(taskTokens.FileBasedInsightsGenerationTask).toBeDefined();
    expect(typeof taskTokens.FileBasedInsightsGenerationTask).toBe("symbol");
  });

  it("should be a class (constructor function)", () => {
    expect(FileBasedInsightsGenerationTask.prototype).toBeDefined();
    expect(typeof FileBasedInsightsGenerationTask.prototype.execute).toBe("function");
  });

  it("should implement the Task interface with execute method", () => {
    expect(typeof FileBasedInsightsGenerationTask.prototype.execute).toBe("function");
  });

  it("should be decorated with @injectable", () => {
    // Verify that the class has the injectable decorator metadata
    const metadata = Reflect.getMetadata("design:paramtypes", FileBasedInsightsGenerationTask);
    expect(metadata).toBeDefined();
    // Should have dependencies injected (LLMStats, EnvVars, RawAnalyzerDrivenByReqsFiles, ProjectName)
    expect(metadata.length).toBeGreaterThan(0);
  });

  it("should have a descriptive class name that reflects its file-driven nature", () => {
    expect(FileBasedInsightsGenerationTask.name).toBe("FileBasedInsightsGenerationTask");
    // Verify the name is more descriptive than the old "DirectInsightsGenerationTask"
    expect(FileBasedInsightsGenerationTask.name).toContain("FileBased");
  });
});
