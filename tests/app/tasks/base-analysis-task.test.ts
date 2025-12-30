import "reflect-metadata";
import { BaseAnalysisTask } from "../../../src/app/tasks/base-analysis-task";
import type LLMStats from "../../../src/common/llm/tracking/llm-stats";
import * as directoryOps from "../../../src/common/fs/directory-operations";

// Concrete implementation for testing the abstract class
class TestAnalysisTask extends BaseAnalysisTask {
  runAnalysisCalled = false;
  runAnalysisError: Error | null = null;

  constructor(
    llmStats: LLMStats,
    projectName: string,
    private readonly customPostMessage: string | null = null,
  ) {
    super(llmStats, projectName);
  }

  protected getStartMessage(): string {
    return "Test task starting for project";
  }

  protected getFinishMessage(): string {
    return "Test task finished";
  }

  protected async runAnalysis(): Promise<void> {
    this.runAnalysisCalled = true;
    if (this.runAnalysisError) {
      throw this.runAnalysisError;
    }
  }

  protected override getPostAnalysisMessage(): string | null {
    return this.customPostMessage;
  }
}

describe("BaseAnalysisTask", () => {
  let mockLlmStats: jest.Mocked<LLMStats>;
  let consoleSpy: jest.SpyInstance;
  let clearDirectorySpy: jest.SpyInstance;

  beforeEach(() => {
    mockLlmStats = {
      displayLLMStatusSummary: jest.fn(),
      displayLLMStatusDetails: jest.fn(),
    } as unknown as jest.Mocked<LLMStats>;

    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    clearDirectorySpy = jest.spyOn(directoryOps, "clearDirectory").mockResolvedValue();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    clearDirectorySpy.mockRestore();
  });

  describe("execute", () => {
    it("should log start message with project name", async () => {
      const task = new TestAnalysisTask(mockLlmStats, "my-project");

      await task.execute();

      expect(consoleSpy).toHaveBeenCalledWith("Test task starting for project: my-project");
    });

    it("should call displayLLMStatusSummary at the start", async () => {
      const task = new TestAnalysisTask(mockLlmStats, "test-project");

      await task.execute();

      expect(mockLlmStats.displayLLMStatusSummary).toHaveBeenCalledTimes(1);
    });

    it("should clear the output directory", async () => {
      const task = new TestAnalysisTask(mockLlmStats, "test-project");

      await task.execute();

      expect(clearDirectorySpy).toHaveBeenCalledTimes(1);
    });

    it("should call runAnalysis", async () => {
      const task = new TestAnalysisTask(mockLlmStats, "test-project");

      await task.execute();

      expect(task.runAnalysisCalled).toBe(true);
    });

    it("should log finish message after analysis", async () => {
      const task = new TestAnalysisTask(mockLlmStats, "test-project");

      await task.execute();

      expect(consoleSpy).toHaveBeenCalledWith("Test task finished");
    });

    it("should log summary header before displaying details", async () => {
      const task = new TestAnalysisTask(mockLlmStats, "test-project");

      await task.execute();

      expect(consoleSpy).toHaveBeenCalledWith("Summary of LLM invocations outcomes:");
    });

    it("should call displayLLMStatusDetails at the end", async () => {
      const task = new TestAnalysisTask(mockLlmStats, "test-project");

      await task.execute();

      expect(mockLlmStats.displayLLMStatusDetails).toHaveBeenCalledTimes(1);
    });

    it("should execute lifecycle steps in correct order", async () => {
      const callOrder: string[] = [];

      mockLlmStats.displayLLMStatusSummary.mockImplementation(() => {
        callOrder.push("displayLLMStatusSummary");
      });
      mockLlmStats.displayLLMStatusDetails.mockImplementation(() => {
        callOrder.push("displayLLMStatusDetails");
      });
      clearDirectorySpy.mockImplementation(async () => {
        callOrder.push("clearDirectory");
      });

      // Create a task that tracks when runAnalysis is called
      class OrderTrackingTask extends TestAnalysisTask {
        protected override async runAnalysis(): Promise<void> {
          callOrder.push("runAnalysis");
          await super.runAnalysis();
        }
      }

      const task = new OrderTrackingTask(mockLlmStats, "test-project");
      await task.execute();

      expect(callOrder).toEqual([
        "displayLLMStatusSummary",
        "clearDirectory",
        "runAnalysis",
        "displayLLMStatusDetails",
      ]);
    });

    it("should log post-analysis message when provided", async () => {
      const task = new TestAnalysisTask(mockLlmStats, "test-project", "View results here");

      await task.execute();

      expect(consoleSpy).toHaveBeenCalledWith("View results here");
    });

    it("should not log post-analysis message when null", async () => {
      const task = new TestAnalysisTask(mockLlmStats, "test-project", null);

      await task.execute();

      // Verify only expected messages were logged (start, finish, summary header)
      const logCalls = consoleSpy.mock.calls.map((call) => call[0]);
      expect(logCalls).not.toContain(null);
    });

    it("should propagate errors from runAnalysis", async () => {
      const task = new TestAnalysisTask(mockLlmStats, "test-project");
      task.runAnalysisError = new Error("Analysis failed");

      await expect(task.execute()).rejects.toThrow("Analysis failed");
    });
  });
});
