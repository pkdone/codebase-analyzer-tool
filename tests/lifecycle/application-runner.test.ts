import "reflect-metadata";
import { bootstrapAndRunTask } from "../../src/lifecycle/application-runner";
import { bootstrapContainer } from "../../src/di/container";
import { getTaskConfiguration } from "../../src/di/registration-modules/task-config-registration";
import { runTask } from "../../src/lifecycle/task-executor";

// Mock dependencies
jest.mock("../../src/di/container");
jest.mock("../../src/di/registration-modules/task-config-registration");
jest.mock("../../src/lifecycle/task-executor");

describe("Application Runner", () => {
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;
  let mockSetInterval: jest.SpyInstance;
  let mockClearInterval: jest.SpyInstance;
  let mockProcessExit: jest.SpyInstance;

  const TEST_TASK_TOKEN = Symbol("TestTask");
  const TEST_CONFIG = { requiresLLM: false, requiresMongoDB: false };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock console methods
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
    mockConsoleError = jest.spyOn(console, "error").mockImplementation();

    // Mock timer functions
    mockSetInterval = jest.spyOn(global, "setInterval").mockImplementation(() => 123 as any);
    mockClearInterval = jest.spyOn(global, "clearInterval").mockImplementation();

    // Mock process.exitCode
    mockProcessExit = jest.spyOn(process, "exitCode", "set").mockImplementation();

    // Setup default mock implementations
    (getTaskConfiguration as jest.Mock).mockReturnValue(TEST_CONFIG);
    (bootstrapContainer as jest.Mock).mockResolvedValue(undefined);
    (runTask as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockSetInterval.mockRestore();
    mockClearInterval.mockRestore();
    mockProcessExit.mockRestore();
  });

  describe("successful execution", () => {
    it("should execute the full application lifecycle successfully", async () => {
      bootstrapAndRunTask(TEST_TASK_TOKEN);

      // Wait for async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(getTaskConfiguration).toHaveBeenCalledWith(TEST_TASK_TOKEN);
      expect(bootstrapContainer).toHaveBeenCalledWith(TEST_CONFIG);
      expect(runTask).toHaveBeenCalledWith(TEST_TASK_TOKEN);
      expect(mockProcessExit).not.toHaveBeenCalled();
    });

    it("should set up and clean up keep-alive interval", async () => {
      bootstrapAndRunTask(TEST_TASK_TOKEN);

      // Verify interval is set up
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30000);

      // Wait for async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify interval is cleaned up
      expect(mockClearInterval).toHaveBeenCalledWith(123);
    });
  });

  describe("error handling", () => {
    it("should handle task configuration errors", async () => {
      const configError = new Error("Configuration failed");
      (getTaskConfiguration as jest.Mock).mockImplementation(() => {
        throw configError;
      });

      bootstrapAndRunTask(TEST_TASK_TOKEN);

      // Wait for async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockConsoleError).toHaveBeenCalledWith("Application error:", configError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockClearInterval).toHaveBeenCalledWith(123);
    });

    it("should handle bootstrap container errors", async () => {
      const bootstrapError = new Error("Bootstrap failed");
      (bootstrapContainer as jest.Mock).mockRejectedValue(bootstrapError);

      bootstrapAndRunTask(TEST_TASK_TOKEN);

      // Wait for async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(getTaskConfiguration).toHaveBeenCalledWith(TEST_TASK_TOKEN);
      expect(bootstrapContainer).toHaveBeenCalledWith(TEST_CONFIG);
      expect(runTask).not.toHaveBeenCalled();
      expect(mockConsoleError).toHaveBeenCalledWith("Application error:", bootstrapError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockClearInterval).toHaveBeenCalledWith(123);
    });

    it("should handle task execution errors", async () => {
      const taskError = new Error("Task execution failed");
      (runTask as jest.Mock).mockRejectedValue(taskError);

      bootstrapAndRunTask(TEST_TASK_TOKEN);

      // Wait for async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(getTaskConfiguration).toHaveBeenCalledWith(TEST_TASK_TOKEN);
      expect(bootstrapContainer).toHaveBeenCalledWith(TEST_CONFIG);
      expect(runTask).toHaveBeenCalledWith(TEST_TASK_TOKEN);
      expect(mockConsoleError).toHaveBeenCalledWith("Application error:", taskError);
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockClearInterval).toHaveBeenCalledWith(123);
    });

    it("should clean up interval even when errors occur", async () => {
      const error = new Error("Any error");
      (runTask as jest.Mock).mockRejectedValue(error);

      bootstrapAndRunTask(TEST_TASK_TOKEN);

      // Wait for async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      // Verify interval was set up and cleaned up despite error
      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
      expect(mockClearInterval).toHaveBeenCalledWith(123);
    });
  });

  describe("keep-alive interval functionality", () => {
    it("should create interval with correct timing", () => {
      bootstrapAndRunTask(TEST_TASK_TOKEN);

      expect(mockSetInterval).toHaveBeenCalledWith(expect.any(Function), 30000);
    });

    it("should execute keep-alive function without errors", () => {
      bootstrapAndRunTask(TEST_TASK_TOKEN);

      // Get the callback function passed to setInterval
      const keepAliveCallback = (mockSetInterval as jest.Mock).mock.calls[0][0];

      // Should not throw when executed
      expect(() => keepAliveCallback()).not.toThrow();
    });
  });

  describe("edge cases", () => {
    it("should handle null/undefined task token", async () => {
      (getTaskConfiguration as jest.Mock).mockImplementation(() => {
        throw new Error("Invalid task token");
      });

      bootstrapAndRunTask(null as any);

      // Wait for async execution to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockConsoleError).toHaveBeenCalled();
      expect(mockProcessExit).toHaveBeenCalledWith(1);
      expect(mockClearInterval).toHaveBeenCalled();
    });

    it("should handle multiple error conditions sequentially", async () => {
      // First call fails with one error
      const firstError = new Error("First error");
      (runTask as jest.Mock).mockRejectedValueOnce(firstError);

      bootstrapAndRunTask(TEST_TASK_TOKEN);

      // Wait for first execution to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockConsoleError).toHaveBeenCalledWith("Application error:", firstError);

      // Reset mocks for second call
      jest.clearAllMocks();
      mockConsoleError = jest.spyOn(console, "error").mockImplementation();
      mockProcessExit = jest.spyOn(process, "exitCode", "set").mockImplementation();
      mockSetInterval = jest.spyOn(global, "setInterval").mockImplementation(() => 456 as any);
      mockClearInterval = jest.spyOn(global, "clearInterval").mockImplementation();

      // Second call fails with different error
      const secondError = new Error("Second error");
      (runTask as jest.Mock).mockRejectedValueOnce(secondError);

      bootstrapAndRunTask(TEST_TASK_TOKEN);

      // Wait for second execution to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockConsoleError).toHaveBeenCalledWith("Application error:", secondError);
      expect(mockClearInterval).toHaveBeenCalledWith(456);
    });
  });
});
