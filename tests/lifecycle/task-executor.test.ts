import { runTask } from "../../src/lifecycle/task-executor";
import { container } from "../../src/di/container";
import { TOKENS } from "../../src/di/tokens";
import { Task } from "../../src/tasks/task.types";
import { ShutdownService } from "../../src/lifecycle/shutdown-service";

// Mock dependencies
jest.mock("../../src/di/container");
jest.mock("../../src/lifecycle/shutdown-service");

describe("Service Runner Integration Tests", () => {
  // Mock instances
  let mockService: Task;
  let mockShutdownService: jest.Mocked<ShutdownService>;
  let mockConsoleLog: jest.SpyInstance;

  // Test service token
  const TEST_SERVICE_TOKEN = Symbol("TestService");

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock service
    mockService = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    // Mock shutdown service
    mockShutdownService = {
      shutdownWithForcedExitFallback: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ShutdownService>;

    // Mock console.log
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

    // Mock container methods
    (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
      switch (token) {
        case TEST_SERVICE_TOKEN:
          return Promise.resolve(mockService);
        case TOKENS.ShutdownService:
          return mockShutdownService;
        default:
          throw new Error(`Unexpected token: ${token.toString()}`);
      }
    });

    // Mock ShutdownService constructor
    (ShutdownService as jest.Mock).mockImplementation(() => mockShutdownService);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("runTask", () => {
    it("should run service and call graceful shutdown", async () => {
      await runTask(TEST_SERVICE_TOKEN);

      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.ShutdownService);
      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(mockShutdownService.shutdownWithForcedExitFallback).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^END:/));
    });

    it("should handle service execution errors and still call shutdownWithForcedExitFallback", async () => {
      const serviceError = new Error("Service execution failed");
      (mockService.execute as jest.Mock).mockRejectedValue(serviceError);

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow("Service execution failed");

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.ShutdownService);
      expect(mockShutdownService.shutdownWithForcedExitFallback).toHaveBeenCalledTimes(1);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^END:/));
    });

    it("should handle service resolution errors", async () => {
      const serviceError = new Error("Failed to resolve service");
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_SERVICE_TOKEN) {
          throw serviceError;
        }
        if (token === TOKENS.ShutdownService) {
          return mockShutdownService;
        }
        throw new Error(`Unexpected token: ${token.toString()}`);
      });

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow("Failed to resolve service");

      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.ShutdownService);
      expect(mockShutdownService.shutdownWithForcedExitFallback).toHaveBeenCalledTimes(1);
    });

    it("should handle graceful shutdown errors", async () => {
      const shutdownError = new Error("Graceful shutdown failed");
      const mockConsoleError = jest.spyOn(console, "error").mockImplementation();
      
      mockShutdownService.shutdownWithForcedExitFallback.mockRejectedValue(shutdownError);

      await runTask(TEST_SERVICE_TOKEN);

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith("Failed to perform graceful shutdown:", shutdownError);

      mockConsoleError.mockRestore();
    });

    it("should log start and end timestamps", async () => {
      await runTask(TEST_SERVICE_TOKEN);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^START: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^END: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      );
    });
  });

  describe("error handling edge cases", () => {
    it("should handle null service resolution", async () => {
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_SERVICE_TOKEN) {
          return Promise.resolve(null);
        }
        if (token === TOKENS.ShutdownService) {
          return mockShutdownService;
        }
        throw new Error(`Unexpected token: ${token.toString()}`);
      });

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow();

      expect(container.resolve).toHaveBeenCalledWith(TOKENS.ShutdownService);
      expect(mockShutdownService.shutdownWithForcedExitFallback).toHaveBeenCalledTimes(1);
    });

    it("should handle service without execute method", async () => {
      const invalidService = {} as Task;
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_SERVICE_TOKEN) {
          return Promise.resolve(invalidService);
        }
        if (token === TOKENS.ShutdownService) {
          return mockShutdownService;
        }
        throw new Error(`Unexpected token: ${token.toString()}`);
      });

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow();

      expect(container.resolve).toHaveBeenCalledWith(TOKENS.ShutdownService);
      expect(mockShutdownService.shutdownWithForcedExitFallback).toHaveBeenCalledTimes(1);
    });

    it("should handle shutdown service resolution errors", async () => {
      const shutdownResolutionError = new Error("Failed to resolve shutdown service");
      const mockConsoleError = jest.spyOn(console, "error").mockImplementation();
      
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_SERVICE_TOKEN) {
          return Promise.resolve(mockService);
        }
        if (token === TOKENS.ShutdownService) {
          throw shutdownResolutionError;
        }
        throw new Error(`Unexpected token: ${token.toString()}`);
      });

      await runTask(TEST_SERVICE_TOKEN);

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith("Failed to perform graceful shutdown:", shutdownResolutionError);

      mockConsoleError.mockRestore();
    });
  });
});