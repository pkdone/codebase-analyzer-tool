import "reflect-metadata";
import { BaseLLMTrackedTask } from "../../../src/app/tasks/base-llm-tracked-task";
import type LLMTelemetryTracker from "../../../src/common/llm/tracking/llm-telemetry-tracker";
import * as directoryOps from "../../../src/common/fs/directory-operations";

// Concrete implementation for testing the abstract class
class TestLLMTrackedTask extends BaseLLMTrackedTask {
  runTaskCalled = false;
  runTaskError: Error | null = null;

  constructor(
    llmStats: LLMTelemetryTracker,
    projectName: string,
    private readonly customPostMessage: string | null = null,
    private readonly clearOutputDir = true,
  ) {
    super(llmStats, projectName);
  }

  protected getStartMessage(): string {
    return "Test task starting for project";
  }

  protected getFinishMessage(): string {
    return "Test task finished";
  }

  protected async runTask(): Promise<void> {
    this.runTaskCalled = true;
    if (this.runTaskError) {
      throw this.runTaskError;
    }
  }

  protected override getPostTaskMessage(): string | null {
    return this.customPostMessage;
  }

  protected override shouldClearOutputDirectory(): boolean {
    return this.clearOutputDir;
  }
}

describe("BaseLLMTrackedTask", () => {
  let mockLlmStats: jest.Mocked<LLMTelemetryTracker>;
  let consoleSpy: jest.SpyInstance;
  let clearDirectorySpy: jest.SpyInstance;

  beforeEach(() => {
    mockLlmStats = {
      displayLLMStatusSummary: jest.fn(),
      displayLLMStatusDetails: jest.fn(),
    } as unknown as jest.Mocked<LLMTelemetryTracker>;

    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    clearDirectorySpy = jest.spyOn(directoryOps, "clearDirectory").mockResolvedValue();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    clearDirectorySpy.mockRestore();
  });

  describe("execute", () => {
    it("should log start message with project name", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "my-project");

      await task.execute();

      expect(consoleSpy).toHaveBeenCalledWith("Test task starting for project: my-project");
    });

    it("should call displayLLMStatusSummary at the start", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "test-project");

      await task.execute();

      expect(mockLlmStats.displayLLMStatusSummary).toHaveBeenCalledTimes(1);
    });

    it("should clear the output directory", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "test-project");

      await task.execute();

      expect(clearDirectorySpy).toHaveBeenCalledTimes(1);
    });

    it("should call runTask", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "test-project");

      await task.execute();

      expect(task.runTaskCalled).toBe(true);
    });

    it("should log finish message after task completes", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "test-project");

      await task.execute();

      expect(consoleSpy).toHaveBeenCalledWith("Test task finished");
    });

    it("should log summary header before displaying details", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "test-project");

      await task.execute();

      expect(consoleSpy).toHaveBeenCalledWith("Summary of LLM invocations outcomes:");
    });

    it("should call displayLLMStatusDetails at the end", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "test-project");

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

      // Create a task that tracks when runTask is called
      class OrderTrackingTask extends TestLLMTrackedTask {
        protected override async runTask(): Promise<void> {
          callOrder.push("runTask");
          await super.runTask();
        }
      }

      const task = new OrderTrackingTask(mockLlmStats, "test-project");
      await task.execute();

      expect(callOrder).toEqual([
        "displayLLMStatusSummary",
        "clearDirectory",
        "runTask",
        "displayLLMStatusDetails",
      ]);
    });

    it("should log post-task message when provided", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "test-project", "View results here");

      await task.execute();

      expect(consoleSpy).toHaveBeenCalledWith("View results here");
    });

    it("should not log post-task message when null", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "test-project", null);

      await task.execute();

      // Verify only expected messages were logged (start, finish, summary header)
      const logCalls = consoleSpy.mock.calls.map((call) => call[0]);
      expect(logCalls).not.toContain(null);
    });

    it("should propagate errors from runTask", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "test-project");
      task.runTaskError = new Error("Task failed");

      await expect(task.execute()).rejects.toThrow("Task failed");
    });

    it("should not clear output directory when shouldClearOutputDirectory returns false", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "test-project", null, false);

      await task.execute();

      expect(clearDirectorySpy).not.toHaveBeenCalled();
    });

    it("should still run task when output directory clearing is disabled", async () => {
      const task = new TestLLMTrackedTask(mockLlmStats, "test-project", null, false);

      await task.execute();

      expect(task.runTaskCalled).toBe(true);
    });
  });
});
