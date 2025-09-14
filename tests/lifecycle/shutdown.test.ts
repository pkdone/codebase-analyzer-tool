import { ShutdownService } from "../../src/lifecycle/shutdown-service";
import LLMRouter from "../../src/llm/core/llm-router";
import { MongoDBClientFactory } from "../../src/common/mdb/mdb-client-factory";

// Mock the dependencies
jest.mock("../../src/llm/core/llm-router");
jest.mock("../../src/common/mdb/mdb-client-factory");

describe("ShutdownService", () => {
  // Mock instances
  let mockLLMRouter: LLMRouter;
  let mockMongoDBClientFactory: MongoDBClientFactory;

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
      const shutdownService = new ShutdownService(mockLLMRouter, mockMongoDBClientFactory);
      
      await shutdownService.gracefulShutdown();

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.providerNeedsForcedShutdown).toHaveBeenCalledTimes(1);
      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should handle shutdown when only llmRouter is available", async () => {
      const shutdownService = new ShutdownService(mockLLMRouter, undefined);
      
      await shutdownService.gracefulShutdown();

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.providerNeedsForcedShutdown).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should handle shutdown when only mongoDBClientFactory is available", async () => {
      const shutdownService = new ShutdownService(undefined, mockMongoDBClientFactory);
      
      await shutdownService.gracefulShutdown();

      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should handle shutdown when no dependencies are available", async () => {
      const shutdownService = new ShutdownService(undefined, undefined);
      
      await shutdownService.gracefulShutdown();

      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should apply Google Cloud specific workaround when provider needs forced shutdown", async () => {
      // Set up the mock to return true for forced shutdown
      (mockLLMRouter.providerNeedsForcedShutdown as jest.Mock).mockReturnValue(true);
      
      const shutdownService = new ShutdownService(mockLLMRouter, mockMongoDBClientFactory);
      
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
      
      const shutdownService = new ShutdownService(mockLLMRouter, mockMongoDBClientFactory);
      
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
      
      const shutdownService = new ShutdownService(mockLLMRouter, mockMongoDBClientFactory);
      
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
      
      const shutdownService = new ShutdownService(mockLLMRouter, mockMongoDBClientFactory);

      await expect(shutdownService.gracefulShutdown()).rejects.toThrow(
        "Failed to close LLM router",
      );

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
    });

    it("should handle errors from mongoDBClientFactory.closeAll gracefully", async () => {
      const error = new Error("Failed to close MongoDB connections");
      (mockMongoDBClientFactory.closeAll as jest.Mock).mockRejectedValue(error);
      
      const shutdownService = new ShutdownService(mockLLMRouter, mockMongoDBClientFactory);

      await expect(shutdownService.gracefulShutdown()).rejects.toThrow(
        "Failed to close MongoDB connections",
      );

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.providerNeedsForcedShutdown).toHaveBeenCalledTimes(1);
      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);
    });

    it("should handle errors from llmRouter.providerNeedsForcedShutdown gracefully", async () => {
      const error = new Error("Failed to check for forced shutdown");
      (mockLLMRouter.providerNeedsForcedShutdown as jest.Mock).mockImplementation(() => {
        throw error;
      });
      
      const shutdownService = new ShutdownService(mockLLMRouter, mockMongoDBClientFactory);

      await expect(shutdownService.gracefulShutdown()).rejects.toThrow(
        "Failed to check for forced shutdown",
      );

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.providerNeedsForcedShutdown).toHaveBeenCalledTimes(1);
    });
  });
});
