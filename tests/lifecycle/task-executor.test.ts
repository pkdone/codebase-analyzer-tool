import { runTask } from "../../src/lifecycle/task-executor";
import { container } from "../../src/di/container";
import { Task } from "../../src/tasks/task.types";

// Mock dependencies
jest.mock("../../src/di/container");

describe("Task Executor Tests", () => {
  // Mock instances
  let mockTask: Task;
  let mockConsoleLog: jest.SpyInstance;

  // Test task token
  const TEST_TASK_TOKEN = Symbol("TestTask");

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock task
    mockTask = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    // Mock console.log
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

    // Mock container methods
    (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
      if (token === TEST_TASK_TOKEN) {
        return Promise.resolve(mockTask);
      }
      throw new Error(`Unexpected token: ${token.toString()}`);
    });
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("runTask", () => {
    it("should resolve and execute task successfully", async () => {
      await runTask(TEST_TASK_TOKEN);

      expect(container.resolve).toHaveBeenCalledWith(TEST_TASK_TOKEN);
      expect(mockTask.execute).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^END:/));
    });

    it("should propagate task execution errors", async () => {
      const taskError = new Error("Task execution failed");
      (mockTask.execute as jest.Mock).mockRejectedValue(taskError);

      await expect(runTask(TEST_TASK_TOKEN)).rejects.toThrow("Task execution failed");

      expect(mockTask.execute).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
      // END should not be called when task throws
    });

    it("should propagate task resolution errors", async () => {
      const resolutionError = new Error("Failed to resolve task");
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_TASK_TOKEN) {
          throw resolutionError;
        }
        throw new Error(`Unexpected token: ${token.toString()}`);
      });

      await expect(runTask(TEST_TASK_TOKEN)).rejects.toThrow("Failed to resolve task");

      expect(container.resolve).toHaveBeenCalledWith(TEST_TASK_TOKEN);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
    });

    it("should log start and end timestamps", async () => {
      await runTask(TEST_TASK_TOKEN);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^START: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^END: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      );
    });

    it("should log end timestamp after successful execution", async () => {
      await runTask(TEST_TASK_TOKEN);

      const calls = mockConsoleLog.mock.calls;
      expect(calls.length).toBeGreaterThanOrEqual(2);
      expect(calls[0][0]).toMatch(/^START:/);
      expect(calls[calls.length - 1][0]).toMatch(/^END:/);
    });
  });

  describe("error handling edge cases", () => {
    it("should handle null task resolution", async () => {
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_TASK_TOKEN) {
          return Promise.resolve(null);
        }
        throw new Error(`Unexpected token: ${token.toString()}`);
      });

      await expect(runTask(TEST_TASK_TOKEN)).rejects.toThrow();
      expect(container.resolve).toHaveBeenCalledWith(TEST_TASK_TOKEN);
    });

    it("should handle task without execute method", async () => {
      const invalidTask = {} as Task;
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_TASK_TOKEN) {
          return Promise.resolve(invalidTask);
        }
        throw new Error(`Unexpected token: ${token.toString()}`);
      });

      await expect(runTask(TEST_TASK_TOKEN)).rejects.toThrow();
      expect(container.resolve).toHaveBeenCalledWith(TEST_TASK_TOKEN);
    });

    it("should handle synchronous task resolution", async () => {
      const syncTask: Task = {
        execute: jest.fn().mockResolvedValue(undefined),
      };

      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_TASK_TOKEN) {
          return syncTask; // Return task directly, not wrapped in Promise
        }
        throw new Error(`Unexpected token: ${token.toString()}`);
      });

      await runTask(TEST_TASK_TOKEN);

      expect(syncTask.execute).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^END:/));
    });
  });
});
