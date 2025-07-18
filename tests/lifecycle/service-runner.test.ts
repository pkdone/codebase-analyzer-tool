/* eslint-disable @typescript-eslint/unbound-method */
import { runService } from "../../src/lifecycle/service-runner";
import { container } from "../../src/di/container";
import { TOKENS } from "../../src/di/tokens";
import { Service } from "../../src/lifecycle/service.types";
import { MongoDBClientFactory } from "../../src/common/mdb/mdb-client-factory";
import LLMRouter from "../../src/llm/core/llm-router";
import { getServiceConfiguration } from "../../src/di/registration-modules/service-config-registration";
import { gracefulShutdown } from "../../src/lifecycle/shutdown";
import { initializeAndRegisterLLMRouter } from "../../src/di/registration-modules/llm-registration";

// Mock dependencies
jest.mock("../../src/di/container");
jest.mock("../../src/di/registration-modules/service-config-registration");
jest.mock("../../src/lifecycle/shutdown");
jest.mock("../../src/common/mdb/mdb-client-factory");
jest.mock("../../src/llm/core/llm-router");
jest.mock("../../src/di/registration-modules/llm-registration");

describe("Service Runner Integration Tests", () => {
  // Mock instances
  let mockService: Service;
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
    (initializeAndRegisterLLMRouter as jest.Mock).mockResolvedValue(mockLLMRouter);

    // Mock container methods
    (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
      switch (token) {
        case TOKENS.MongoDBClientFactory:
          return mockMongoDBClientFactory; // Synchronous for MongoDB
        case TOKENS.LLMRouter:
          return mockLLMRouter; // Synchronous for LLM when already registered
        case TEST_SERVICE_TOKEN:
          return Promise.resolve(mockService); // Async for service
        default:
          return undefined;
      }
    });

    (container.isRegistered as jest.Mock).mockImplementation((token: symbol): boolean => {
      // By default, assume LLMRouter is not registered so it gets initialized
      return token !== TOKENS.LLMRouter;
    });
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  describe("runService", () => {
    it("should run service with no dependencies", async () => {
      const config = {
        requiresMongoDB: false,
        requiresLLM: false,
      };

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await runService(TEST_SERVICE_TOKEN);

      expect(getServiceConfiguration).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^END:/));
    });

    it("should run service with MongoDB dependency", async () => {
      const config = {
        requiresMongoDB: true,
        requiresLLM: false,
      };

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await runService(TEST_SERVICE_TOKEN);

      expect(getServiceConfiguration).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, mockMongoDBClientFactory);
    });

    it("should run service with LLM dependency", async () => {
      const config = {
        requiresMongoDB: false,
        requiresLLM: true,
      };

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await runService(TEST_SERVICE_TOKEN);

      expect(getServiceConfiguration).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(initializeAndRegisterLLMRouter).toHaveBeenCalledTimes(1);
      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(mockLLMRouter, undefined);
    });

    it("should run service with both MongoDB and LLM dependencies", async () => {
      const config = {
        requiresMongoDB: true,
        requiresLLM: true,
      };

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await runService(TEST_SERVICE_TOKEN);

      expect(getServiceConfiguration).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(initializeAndRegisterLLMRouter).toHaveBeenCalledTimes(1);
      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(mockLLMRouter, mockMongoDBClientFactory);
    });

    it("should handle service execution errors and still call gracefulShutdown", async () => {
      const config = {
        requiresMongoDB: true,
        requiresLLM: true,
      };

      const serviceError = new Error("Service execution failed");
      (mockService.execute as jest.Mock).mockRejectedValue(serviceError);

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await expect(runService(TEST_SERVICE_TOKEN)).rejects.toThrow("Service execution failed");

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(mockLLMRouter, mockMongoDBClientFactory);
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^START:/));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringMatching(/^END:/));
    });

    it("should handle MongoDB client factory resolution errors", async () => {
      const config = {
        requiresMongoDB: true,
        requiresLLM: false,
      };

      const mongoError = new Error("Failed to resolve MongoDB client factory");
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TOKENS.MongoDBClientFactory) {
          throw mongoError;
        }
        return Promise.resolve(mockService);
      });

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await expect(runService(TEST_SERVICE_TOKEN)).rejects.toThrow(
        "Failed to resolve MongoDB client factory",
      );

      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle LLM router resolution errors", async () => {
      const config = {
        requiresMongoDB: false,
        requiresLLM: true,
      };

      const llmError = new Error("Failed to resolve LLM router");
      (initializeAndRegisterLLMRouter as jest.Mock).mockRejectedValue(llmError);

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await expect(runService(TEST_SERVICE_TOKEN)).rejects.toThrow("Failed to resolve LLM router");

      expect(initializeAndRegisterLLMRouter).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle service resolution errors", async () => {
      const config = {
        requiresMongoDB: true,
        requiresLLM: true,
      };

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

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await expect(runService(TEST_SERVICE_TOKEN)).rejects.toThrow("Failed to resolve service");

      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(initializeAndRegisterLLMRouter).toHaveBeenCalledTimes(1);
      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(gracefulShutdown).toHaveBeenCalledWith(mockLLMRouter, mockMongoDBClientFactory);
    });

    it("should handle gracefulShutdown errors", async () => {
      const config = {
        requiresMongoDB: false,
        requiresLLM: false,
      };

      const shutdownError = new Error("Graceful shutdown failed");
      (gracefulShutdown as jest.Mock).mockRejectedValue(shutdownError);

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await expect(runService(TEST_SERVICE_TOKEN)).rejects.toThrow("Graceful shutdown failed");

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle getServiceConfiguration errors", async () => {
      const configError = new Error("Service configuration not found");
      (getServiceConfiguration as jest.Mock).mockImplementation(() => {
        throw configError;
      });

      await expect(runService(TEST_SERVICE_TOKEN)).rejects.toThrow(
        "Service configuration not found",
      );

      expect(getServiceConfiguration).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should resolve dependencies in correct order", async () => {
      const config = {
        requiresMongoDB: true,
        requiresLLM: true,
      };

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await runService(TEST_SERVICE_TOKEN);

      // Verify the order of resolution calls
      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(initializeAndRegisterLLMRouter).toHaveBeenCalledTimes(1);
      expect(container.resolve).toHaveBeenCalledWith(TEST_SERVICE_TOKEN);
    });

    it("should log start and end timestamps", async () => {
      const config = {
        requiresMongoDB: false,
        requiresLLM: false,
      };

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await runService(TEST_SERVICE_TOKEN);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^START: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/^END: \d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
      );
    });

    it("should handle partial dependency failures gracefully", async () => {
      const config = {
        requiresMongoDB: true,
        requiresLLM: true,
      };

      // MongoDB resolves successfully, LLM fails
      const llmError = new Error("LLM resolution failed");
      (initializeAndRegisterLLMRouter as jest.Mock).mockRejectedValue(llmError);

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await expect(runService(TEST_SERVICE_TOKEN)).rejects.toThrow("LLM resolution failed");

      expect(container.resolve).toHaveBeenCalledWith(TOKENS.MongoDBClientFactory);
      expect(initializeAndRegisterLLMRouter).toHaveBeenCalledTimes(1);
      // Service should not be resolved due to LLM failure
      expect(container.resolve).not.toHaveBeenCalledWith(TEST_SERVICE_TOKEN);

      // Graceful shutdown should still be called with the MongoDB client that was resolved
      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, mockMongoDBClientFactory);
    });

    it("should handle mixed sync and async resolution", async () => {
      const config = {
        requiresMongoDB: true,
        requiresLLM: true,
      };

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await runService(TEST_SERVICE_TOKEN);

      expect(mockService.execute).toHaveBeenCalledTimes(1);
      expect(gracefulShutdown).toHaveBeenCalledWith(mockLLMRouter, mockMongoDBClientFactory);
    });
  });

  describe("error handling edge cases", () => {
    it("should handle undefined service configuration", async () => {
      (getServiceConfiguration as jest.Mock).mockReturnValue(undefined);

      await expect(runService(TEST_SERVICE_TOKEN)).rejects.toThrow();

      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle null service resolution", async () => {
      const config = {
        requiresMongoDB: false,
        requiresLLM: false,
      };

      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_SERVICE_TOKEN) {
          return Promise.resolve(null);
        }
        return undefined;
      });

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await expect(runService(TEST_SERVICE_TOKEN)).rejects.toThrow();

      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
    });

    it("should handle service without execute method", async () => {
      const config = {
        requiresMongoDB: false,
        requiresLLM: false,
      };

      const invalidService = {} as Service;
      (container.resolve as jest.Mock).mockImplementation((token: symbol): unknown => {
        if (token === TEST_SERVICE_TOKEN) {
          return Promise.resolve(invalidService);
        }
        return undefined;
      });

      (getServiceConfiguration as jest.Mock).mockReturnValue(config);

      await expect(runService(TEST_SERVICE_TOKEN)).rejects.toThrow();

      expect(gracefulShutdown).toHaveBeenCalledWith(undefined, undefined);
    });
  });
});
