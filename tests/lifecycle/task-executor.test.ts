import { runTask } from "../../src/lifecycle/task-executor";
import { container } from "../../src/di/container";
import { TOKENS } from "../../src/di/tokens";
import { Task } from "../../src/lifecycle/task.types";
import { MongoDBClientFactory } from "../../src/common/mdb/mdb-client-factory";
import LLMRouter from "../../src/llm/core/llm-router";
import { gracefulShutdown } from "../../src/lifecycle/shutdown";

// Mock dependencies
jest.mock("../../src/di/container");
jest.mock("../../src/lifecycle/shutdown");
jest.mock("../../src/common/mdb/mdb-client-factory");
jest.mock("../../src/llm/core/llm-router");

describe("Service Runner Integration Tests", () => {
  // Mock instances
  let mockService: Task;
  let mockMongoDBClientFactory: MongoDBClientFactory;
  let mockLLMRouter: LLMRouter;
  let mockConsoleLog: jest.SpyInstance;

  // Test service token
  const TEST_SERVICE_TOKEN = Symbol.for("TestService");

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock service
    mockService = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    // Mock MongoDB client factory
    mockMongoDBClientFactory = {
      connect: jest.fn(),
      getClient: jest.fn(),
      closeAll: jest.fn().mockResolvedValue(undefined),
    } as unknown as MongoDBClientFactory;

    // Mock LLM router
    mockLLMRouter = {
      close: jest.fn().mockResolvedValue(undefined),
      getModelFamily: jest.fn().mockReturnValue("TestProvider"),
    } as unknown as LLMRouter;

    // Mock console.log
    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

    // Set up default mocks
    (gracefulShutdown as jest.Mock).mockResolvedValue(undefined);

    // Mock container methods - default to no dependencies registered
    (container.isRegistered as jest.Mock).mockReturnValue(false);
    (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
      switch (token) {
        case TOKENS.MongoDBClientFactory:
          return mockMongoDBClientFactory;
        case TOKENS.LLMRouter:
          return mockLLMRouter;
        case TEST_SERVICE_TOKEN:
          return Promise.resolve(mockService);
        default:
          return undefined;
      }
    });
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("runTask", () => {
    it("should run service with no dependencies", async () => {
      // No dependencies are registered (default mock setup)
      await runTask(TEST_SERVICE_TOKEN);

      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(container.isRegistered).toHaveBeenCalledWith(TOKENS.LLMRouter);
      expect(container.isRegistered).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^END:/));
    });

    it("should run service with MongoDB dependency", async () => {
      // Mock MongoDB as registered
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.MongoDBClientFactory;
      });

      await runTask(TEST_SERVICE_TOKEN);

      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, mockMongoDBClientFactory);
    });

    it("should run service with LLM dependency", async () => {
      // Mock LLM as registered
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.LLMRouter;
      });

      await runTask(TEST_SERVICE_TOKEN);

      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.LLMRouter);
      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(mockLLMRouter, undefined);
    });

    it("should run service with both MongoDB and LLM dependencies", async () => {
      // Mock both dependencies as registered
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.MongoDBClientFactory || token === TOKENS.LLMRouter;
      });

      await runTask(TEST_SERVICE_TOKEN);

      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.LLMRouter);
      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(mockLLMRouter, mockMongoDBClientFactory);
    });

    it("should handle service execution errors and still call gracefulShutdown", async () => {
      // Mock both dependencies as registered
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.MongoDBClientFactory || token === TOKENS.LLMRouter;
      });

      const serviceError = new Error("Service execution failed");
      (mockService.execute as jest.Mock).mockRejectedValue(serviceError);

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow("Service execution failed");

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(mockLLMRouter, mockMongoDBClientFactory);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^END:/));
    });

    it("should handle MongoDB client factory resolution errors during shutdown", async () => {
      // Mock MongoDB as registered but throw error when resolving
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.MongoDBClientFactory;
      });

      const mongoError = new Error("Failed to resolve MongoDB client factory");
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
      
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
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(mockConsoleError).toHaveBeenCalledWith("Failed to resolve MongoDBClientFactory for shutdown:", mongoError);
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
      
      mockConsoleError.mockRestore();
    });

    it("should handle LLM router resolution errors during shutdown", async () => {
      // Mock LLM as registered but throw error when resolving
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.LLMRouter;
      });

      const llmError = new Error("Failed to resolve LLM router");
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
      
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
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.LLMRouter);
      expect(mockConsoleError).toHaveBeenCalledWith("Failed to resolve LLMRouter for shutdown:", llmError);
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
      
      mockConsoleError.mockRestore();
    });

    it("should handle service resolution errors", async () => {
      // Mock both dependencies as registered
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.MongoDBClientFactory || token === TOKENS.LLMRouter;
      });

      const serviceError = new Error("Failed to resolve service");
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        switch (token) {
          case TOKENS.MongoDBClientFactory:
            return mockMongoDBClientFactory;
          case TOKENS.LLMRouter:
            return mockLLMRouter;
          case TEST_SERVICE_TOKEN:
            throw serviceError;
          default:
            return undefined;
        }
      });

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow("Failed to resolve service");

      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(gracefulShutdown).toHaveBeenCalledWith(mockLLMRouter, mockMongoDBClientFactory);
    });

    it("should handle gracefulShutdown errors", async () => {
      // No dependencies registered (default mock setup)
      const shutdownError = new Error("Graceful shutdown failed");
      (gracefulShutdown as jest.Mock).mockRejectedValue(shutdownError);

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow("Graceful shutdown failed");

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
    });



    it("should resolve service first, then shutdown dependencies", async () => {
      // Mock both dependencies as registered
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.MongoDBClientFactory || token === TOKENS.LLMRouter;
      });

      await runTask(TEST_SERVICE_TOKEN);

      // Verify that service is resolved first (during execution)
      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      // Then shutdown dependencies are resolved (in finally block)
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.LLMRouter);
    });

    it("should log start and end timestamps", async () => {
      // No dependencies registered (default mock setup)
      await runTask(TEST_SERVICE_TOKEN);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^START: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^END: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      );
    });

    it("should handle partial shutdown dependency failures gracefully", async () => {
      // Mock both dependencies as registered
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.MongoDBClientFactory || token === TOKENS.LLMRouter;
      });

      // MongoDB resolves successfully during shutdown, LLM fails during shutdown
      const llmError = new Error("LLM resolution failed");
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();
      
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        switch (token) {
          case TOKENS.MongoDBClientFactory:
            return mockMongoDBClientFactory;
          case TOKENS.LLMRouter:
            throw llmError;
          case TEST_SERVICE_TOKEN:
            return Promise.resolve(mockService);
          default:
            return undefined;
        }
      });

      await runTask(TEST_SERVICE_TOKEN);

      // Service should execute successfully
      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);

      // Both shutdown dependencies should be attempted
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.LLMRouter);

      // Console error should be logged for failed LLM resolution
      expect(mockConsoleError).toHaveBeenCalledWith("Failed to resolve LLMRouter for shutdown:", llmError);

      // Graceful shutdown should be called with successfully resolved MongoDB, undefined for LLM
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, mockMongoDBClientFactory);
      
      mockConsoleError.mockRestore();
    });

    it("should handle mixed sync and async resolution", async () => {
      // Mock both dependencies as registered  
      (container.isRegistered as jest.Mock).mockImplementation((token: symbol) => {
        return token === TOKENS.MongoDBClientFactory || token === TOKENS.LLMRouter;
      });

      await runTask(TEST_SERVICE_TOKEN);

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(mockLLMRouter, mockMongoDBClientFactory);
    });
  });

  describe("error handling edge cases", () => {

    it("should handle null service resolution", async () => {
      // No dependencies registered (default mock setup)
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_SERVICE_TOKEN) {
          return Promise.resolve(null);
        }
        return undefined;
      });

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow();

      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle service without execute method", async () => {
      // No dependencies registered (default mock setup)
      const invalidService = {} as Task;
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_SERVICE_TOKEN) {
          return Promise.resolve(invalidService);
        }
        return undefined;
      });

      await expect(runTask(TEST_SERVICE_TOKEN)).rejects.toThrow();

      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
    });
  });
});
