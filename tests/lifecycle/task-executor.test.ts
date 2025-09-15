import { runTask } from "../../src/lifecycle/task-executor";
import { container } from "../../src/di/container";
import { TOKENS } from "../../src/di/tokens";
import { Task } from "../../src/tasks/task.types";
import { ShutdownService } from "../../src/lifecycle/shutdown-service";
import LLMRouter from "../../src/llm/core/llm-router";
import { MongoDBClientFactory } from "../../src/common/mdb/mdb-client-factory";

// Mock dependencies
jest.mock("../../src/di/container");
jest.mock("../../src/lifecycle/shutdown-service");
jest.mock("../../src/llm/core/llm-router");
jest.mock("../../src/common/mdb/mdb-client-factory");

describe("Service Runner Integration Tests", () => {
  // Mock instances
  let mockService: Task;
  let mockLLMRouter: LLMRouter;
  let mockMongoDBClientFactory: MongoDBClientFactory;
  let mockConsoleLog: jest.SpyInstance;

  // Test service token
  const TEST_SERVICE_TOKEN = Symbol.for("TestService");

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock service
    mockService = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    // Mock LLM router
    mockLLMRouter = {
      close: jest.fn().mockResolvedValue(undefined),
      providerNeedsForcedShutdown: jest.fn().mockReturnValue(false),
    } as unknown as LLMRouter;

    // Mock MongoDB client factory
    mockMongoDBClientFactory = {
      closeAll: jest.fn().mockResolvedValue(undefined),
    } as unknown as MongoDBClientFactory;

    // Mock console.log
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

    // Mock container methods - default to no dependencies registered
    (container.isRegistered as jest.Mock).mockReturnValue(false);
    (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
      switch (token) {
        case TOKENS.LLMRouter:
          return mockLLMRouter;
        case TOKENS.MongoDBClientFactory:
          return mockMongoDBClientFactory;
        case TEST_SERVICE_TOKEN:
          return Promise.resolve(mockService);
        default:
          return undefined;
      }
    });

    // Mock ShutdownService constructor
    (ShutdownService as jest.Mock).mockImplementation(() => ({
      shutdownWithForcedExitFallback: jest.fn().mockResolvedValue(undefined),
    }));
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("runTask", () => {
    it("should run service and call graceful shutdown with no dependencies", async () => {
      await runTask(TEST_SERVICE_TOKEN);

      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(container.isRegistered).toHaveBeenCalledWith(TOKENS.LLMRouter);
      expect(container.isRegistered).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(ShutdownService).toHaveBeenCalledWith(undefined, undefined);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^END:/));
    });

    it("should handle service execution errors and still call shutdownWithForcedExitFallback", async () => {
      const serviceError = new Error("Service execution failed");
      (mockService.execute as jest.Mock).mockRejectedValue(serviceError);

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow("Service execution failed");

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(ShutdownService).toHaveBeenCalledWith(undefined, undefined);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^END:/));
    });

    it("should handle shutdown with both dependencies available", async () => {
      // Mock both dependencies as registered
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.LLMRouter || token === TOKENS.MongoDBClientFactory;
      });

      await runTask(TEST_SERVICE_TOKEN);

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.LLMRouter);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(ShutdownService).toHaveBeenCalledWith(mockLLMRouter, mockMongoDBClientFactory);
    });

    it("should handle shutdown with only LLM router available", async () => {
      // Mock only LLM router as registered
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.LLMRouter;
      });

      await runTask(TEST_SERVICE_TOKEN);

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.LLMRouter);
      expect(ShutdownService).toHaveBeenCalledWith(mockLLMRouter, undefined);
    });

    it("should handle shutdown with only MongoDB factory available", async () => {
      // Mock only MongoDB factory as registered
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.MongoDBClientFactory;
      });

      await runTask(TEST_SERVICE_TOKEN);

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(ShutdownService).toHaveBeenCalledWith(undefined, mockMongoDBClientFactory);
    });

    it("should handle service resolution errors", async () => {
      const serviceError = new Error("Failed to resolve service");
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_SERVICE_TOKEN) {
          throw serviceError;
        }
        return undefined;
      });

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow("Failed to resolve service");

      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(ShutdownService).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle LLM router resolution errors during shutdown", async () => {
      const llmError = new Error("Failed to resolve LLM router");
      const mockConsoleError = jest.spyOn(console, "error").mockImplementation();
      
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.LLMRouter;
      });

      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TOKENS.LLMRouter) {
          throw llmError;
        }
        if (token === TEST_SERVICE_TOKEN) {
          return Promise.resolve(mockService);
        }
        return undefined;
      });

      await runTask(TEST_SERVICE_TOKEN);

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith("Failed to resolve LLMRouter for shutdown:", llmError);
      expect(ShutdownService).toHaveBeenCalledWith(undefined, undefined);

      mockConsoleError.mockRestore();
    });

    it("should handle MongoDB factory resolution errors during shutdown", async () => {
      const mongoError = new Error("Failed to resolve MongoDB factory");
      const mockConsoleError = jest.spyOn(console, "error").mockImplementation();
      
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.MongoDBClientFactory;
      });

      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TOKENS.MongoDBClientFactory) {
          throw mongoError;
        }
        if (token === TEST_SERVICE_TOKEN) {
          return Promise.resolve(mockService);
        }
        return undefined;
      });

      await runTask(TEST_SERVICE_TOKEN);

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(mockConsoleError).toHaveBeenCalledWith("Failed to resolve MongoDBClientFactory for shutdown:", mongoError);
      expect(ShutdownService).toHaveBeenCalledWith(undefined, undefined);

      mockConsoleError.mockRestore();
    });

    it("should handle graceful shutdown errors", async () => {
      const shutdownError = new Error("Graceful shutdown failed");
      const mockConsoleError = jest.spyOn(console, "error").mockImplementation();
      
      // Mock ShutdownService to throw error
      (ShutdownService as jest.Mock).mockImplementation(() => ({
        shutdownWithForcedExitFallback: jest.fn().mockRejectedValue(shutdownError),
      }));

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
        return undefined;
      });

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow();

      expect(ShutdownService).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle service without execute method", async () => {
      const invalidService = {} as Task;
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_SERVICE_TOKEN) {
          return Promise.resolve(invalidService);
        }
        return undefined;
      });

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow();

      expect(ShutdownService).toHaveBeenCalledWith(undefined, undefined);
    });
  });
});
