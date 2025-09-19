import "reflect-metadata";
import { ShutdownService } from "../../src/lifecycle/shutdown-service";
import LLMRouter from "../../src/llm/core/llm-router";
import { MongoDBClientFactory } from "../../src/common/mdb/mdb-client-factory";
import { container } from "tsyringe";
import { TOKENS } from "../../src/di/tokens";

// Mock the dependencies
jest.mock("../../src/llm/core/llm-router");
jest.mock("../../src/common/mdb/mdb-client-factory");

// Mock tsyringe decorators
jest.mock("tsyringe", () => ({
  injectable: () => (target: any) => target,
  container: {
    isRegistered: jest.fn(),
    resolve: jest.fn(),
  },
}));

describe("ShutdownService", () => {
  // Mock instances
  let mockLLMRouter: LLMRouter;
  let mockMongoDBClientFactory: MongoDBClientFactory;
  let mockContainer: jest.Mocked<typeof container>;

  // Mock process.exit to prevent actual process termination during tests
  const originalProcessExit = process.exit;
  const mockProcessExit = jest.fn();

  // Mock setTimeout to control timing in tests
  const mockSetTimeout = jest.fn();
  const originalSetTimeout = global.setTimeout;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock instances
    mockLLMRouter = {
      close: jest.fn().mockResolvedValue(undefined),
      providerNeedsForcedShutdown: jest.fn().mockReturnValue(false),
    } as unknown as LLMRouter;

    mockMongoDBClientFactory = {
      closeAll: jest.fn().mockResolvedValue(undefined),
    } as unknown as MongoDBClientFactory;

    // Mock the container
    mockContainer = container as jest.Mocked<typeof container>;
    mockContainer.isRegistered = jest.fn();
    mockContainer.resolve = jest.fn();

    // Mock process.exit
    process.exit = mockProcessExit as unknown as typeof process.exit;

    // Mock setTimeout
    global.setTimeout = mockSetTimeout as unknown as typeof global.setTimeout;
  });

  afterEach(() => {
    // Restore original functions
    process.exit = originalProcessExit;
    global.setTimeout = originalSetTimeout;
  });

  describe("gracefulShutdown", () => {
    it("should handle shutdown when both llmRouter and mongoDBClientFactory are available", async () => {
      // Mock container to return both dependencies
      mockContainer.isRegistered.mockImplementation((token) => {
        return token === TOKENS.LLMRouter || token === TOKENS.MongoDBClientFactory;
      });
      mockContainer.resolve.mockImplementation((token) => {
        if (token === TOKENS.LLMRouter) return mockLLMRouter;
        if (token === TOKENS.MongoDBClientFactory) return mockMongoDBClientFactory;
        throw new Error("Unexpected token");
      });

      const shutdownService = new ShutdownService();

      await shutdownService.gracefulShutdown();

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.providerNeedsForcedShutdown).toHaveBeenCalledTimes(1);
      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should handle shutdown when only llmRouter is available", async () => {
      // Mock container to return only LLMRouter
      mockContainer.isRegistered.mockImplementation((token) => {
        return token === TOKENS.LLMRouter;
      });
      mockContainer.resolve.mockImplementation((token) => {
        if (token === TOKENS.LLMRouter) return mockLLMRouter;
        throw new Error("Unexpected token");
      });

      const shutdownService = new ShutdownService();

      await shutdownService.gracefulShutdown();

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.providerNeedsForcedShutdown).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should handle shutdown when only mongoDBClientFactory is available", async () => {
      // Mock container to return only MongoDBClientFactory
      mockContainer.isRegistered.mockImplementation((token) => {
        return token === TOKENS.MongoDBClientFactory;
      });
      mockContainer.resolve.mockImplementation((token) => {
        if (token === TOKENS.MongoDBClientFactory) return mockMongoDBClientFactory;
        throw new Error("Unexpected token");
      });

      const shutdownService = new ShutdownService();

      await shutdownService.gracefulShutdown();

      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should handle shutdown when no dependencies are available", async () => {
      // Mock container to return no dependencies
      mockContainer.isRegistered.mockReturnValue(false);

      const shutdownService = new ShutdownService();

      await shutdownService.gracefulShutdown();

      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should apply Google Cloud specific workaround when provider needs forced shutdown", async () => {
      // Set up the mock to return true for forced shutdown
      (mockLLMRouter.providerNeedsForcedShutdown as jest.Mock).mockReturnValue(true);

      // Mock container to return both dependencies
      mockContainer.isRegistered.mockImplementation((token) => {
        return token === TOKENS.LLMRouter || token === TOKENS.MongoDBClientFactory;
      });
      mockContainer.resolve.mockImplementation((token) => {
        if (token === TOKENS.LLMRouter) return mockLLMRouter;
        if (token === TOKENS.MongoDBClientFactory) return mockMongoDBClientFactory;
        throw new Error("Unexpected token");
      });

      const shutdownService = new ShutdownService();

      await shutdownService.gracefulShutdown();

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.providerNeedsForcedShutdown).toHaveBeenCalledTimes(1);
      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);

      // Verify that setTimeout was called with the specific workaround
      expect(mockSetTimeout).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it("should not apply Google Cloud workaround for other providers", async () => {
      // Set up the mock to return false for forced shutdown
      (mockLLMRouter.providerNeedsForcedShutdown as jest.Mock).mockReturnValue(false);

      // Mock container to return both dependencies
      mockContainer.isRegistered.mockImplementation((token) => {
        return token === TOKENS.LLMRouter || token === TOKENS.MongoDBClientFactory;
      });
      mockContainer.resolve.mockImplementation((token) => {
        if (token === TOKENS.LLMRouter) return mockLLMRouter;
        if (token === TOKENS.MongoDBClientFactory) return mockMongoDBClientFactory;
        throw new Error("Unexpected token");
      });

      const shutdownService = new ShutdownService();

      await shutdownService.gracefulShutdown();

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.providerNeedsForcedShutdown).toHaveBeenCalledTimes(1);
      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);

      // Verify that setTimeout was NOT called for non-problematic providers
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should execute the timeout callback correctly for forced shutdown", async () => {
      // Set up the mock to return true for forced shutdown
      (mockLLMRouter.providerNeedsForcedShutdown as jest.Mock).mockReturnValue(true);

      // Mock container to return both dependencies
      mockContainer.isRegistered.mockImplementation((token) => {
        return token === TOKENS.LLMRouter || token === TOKENS.MongoDBClientFactory;
      });
      mockContainer.resolve.mockImplementation((token) => {
        if (token === TOKENS.LLMRouter) return mockLLMRouter;
        if (token === TOKENS.MongoDBClientFactory) return mockMongoDBClientFactory;
        throw new Error("Unexpected token");
      });

      const shutdownService = new ShutdownService();

      await shutdownService.gracefulShutdown();

      // Verify setTimeout was called
      expect(mockSetTimeout).toHaveBeenCalledTimes(1);

      // Get the callback function that was passed to setTimeout
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
      const timeoutCallback = (mockSetTimeout as jest.Mock).mock.calls[0][0] as () => void;

      // Mock console.log to verify the warning message
      const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

      // Execute the callback
      timeoutCallback();

      // Verify that the warning message was logged and process.exit was called
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Forced exit because GCP client connections cannot be closed properly",
      );
      expect(mockProcessExit).toHaveBeenCalledWith(0);

      // Restore console.log
      mockConsoleLog.mockRestore();
    });

    it("should handle errors from llmRouter.close gracefully", async () => {
      const error = new Error("Failed to close LLM router");
      (mockLLMRouter.close as jest.Mock).mockRejectedValue(error);

      // Spy on console.error to verify error is logged
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Mock container to return both dependencies
      mockContainer.isRegistered.mockImplementation((token) => {
        return token === TOKENS.LLMRouter || token === TOKENS.MongoDBClientFactory;
      });
      mockContainer.resolve.mockImplementation((token) => {
        if (token === TOKENS.LLMRouter) return mockLLMRouter;
        if (token === TOKENS.MongoDBClientFactory) return mockMongoDBClientFactory;
        throw new Error("Unexpected token");
      });

      const shutdownService = new ShutdownService();

      // Should not throw - errors are logged instead
      await expect(shutdownService.gracefulShutdown()).resolves.not.toThrow();

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1); // Both should be attempted
      expect(consoleSpy).toHaveBeenCalledWith("A shutdown operation failed:", error);

      consoleSpy.mockRestore();
    });

    it("should handle errors from mongoDBClientFactory.closeAll gracefully", async () => {
      const error = new Error("Failed to close MongoDB connections");
      (mockMongoDBClientFactory.closeAll as jest.Mock).mockRejectedValue(error);

      // Spy on console.error to verify error is logged
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Mock container to return both dependencies
      mockContainer.isRegistered.mockImplementation((token) => {
        return token === TOKENS.LLMRouter || token === TOKENS.MongoDBClientFactory;
      });
      mockContainer.resolve.mockImplementation((token) => {
        if (token === TOKENS.LLMRouter) return mockLLMRouter;
        if (token === TOKENS.MongoDBClientFactory) return mockMongoDBClientFactory;
        throw new Error("Unexpected token");
      });

      const shutdownService = new ShutdownService();

      // Should not throw - errors are logged instead
      await expect(shutdownService.gracefulShutdown()).resolves.not.toThrow();

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.providerNeedsForcedShutdown).toHaveBeenCalledTimes(1);
      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalledWith("A shutdown operation failed:", error);

      consoleSpy.mockRestore();
    });

    it("should handle errors from llmRouter.providerNeedsForcedShutdown gracefully", async () => {
      const error = new Error("Failed to check for forced shutdown");
      (mockLLMRouter.providerNeedsForcedShutdown as jest.Mock).mockImplementation(() => {
        throw error;
      });

      // Mock container to return both dependencies
      mockContainer.isRegistered.mockImplementation((token) => {
        return token === TOKENS.LLMRouter || token === TOKENS.MongoDBClientFactory;
      });
      mockContainer.resolve.mockImplementation((token) => {
        if (token === TOKENS.LLMRouter) return mockLLMRouter;
        if (token === TOKENS.MongoDBClientFactory) return mockMongoDBClientFactory;
        throw new Error("Unexpected token");
      });

      // Spy on console.error to verify error logging
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const shutdownService = new ShutdownService();

      // The method should now complete gracefully instead of throwing
      await expect(shutdownService.gracefulShutdown()).resolves.not.toThrow();

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.providerNeedsForcedShutdown).toHaveBeenCalledTimes(1);
      // Verify the error was logged instead of thrown
      expect(consoleSpy).toHaveBeenCalledWith("Error during forced shutdown check:", error);

      consoleSpy.mockRestore();
    });
  });
});
