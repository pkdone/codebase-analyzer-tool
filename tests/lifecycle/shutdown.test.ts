/* eslint-disable @typescript-eslint/unbound-method */
import { gracefulShutdown } from "../../src/lifecycle/shutdown";
import LLMRouter from "../../src/llm/core/llm-router";
import { MongoDBClientFactory } from "../../src/common/mdb/mdb-client-factory";
import { llmConfig } from "../../src/llm/llm.config";

// Mock the dependencies
jest.mock("../../src/llm/core/llm-router");
jest.mock("../../src/common/mdb/mdb-client-factory");

describe("Shutdown Module", () => {
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
      getModelFamily: jest.fn().mockReturnValue("OpenAI"),
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
    it("should handle shutdown when both llmRouter and mongoDBClientFactory are provided", async () => {
      await gracefulShutdown(mockLLMRouter, mockMongoDBClientFactory);

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.getModelFamily).toHaveBeenCalledTimes(1);
      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should handle shutdown when only llmRouter is provided", async () => {
      await gracefulShutdown(mockLLMRouter);

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.getModelFamily).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should handle shutdown when only mongoDBClientFactory is provided", async () => {
      await gracefulShutdown(undefined, mockMongoDBClientFactory);

      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should handle shutdown when neither dependency is provided", async () => {
      await gracefulShutdown();

      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should apply Google Cloud specific workaround when using VertexAI", async () => {
      // Set up the mock to return the problematic provider
      (mockLLMRouter.getModelFamily as jest.Mock).mockReturnValue(
        llmConfig.PROBLEMATIC_SHUTDOWN_LLM_PROVIDER,
      );

      await gracefulShutdown(mockLLMRouter, mockMongoDBClientFactory);

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.getModelFamily).toHaveBeenCalledTimes(1);
      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);

      // Verify that setTimeout was called with the specific workaround
      expect(mockSetTimeout).toHaveBeenCalledTimes(1);
      expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
    });

    it("should not apply Google Cloud workaround for other providers", async () => {
      // Set up the mock to return a different provider
      (mockLLMRouter.getModelFamily as jest.Mock).mockReturnValue("OpenAI");

      await gracefulShutdown(mockLLMRouter, mockMongoDBClientFactory);

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.getModelFamily).toHaveBeenCalledTimes(1);
      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);

      // Verify that setTimeout was NOT called for non-problematic providers
      expect(mockSetTimeout).not.toHaveBeenCalled();
    });

    it("should execute the timeout callback correctly for VertexAI", async () => {
      // Set up the mock to return the problematic provider
      (mockLLMRouter.getModelFamily as jest.Mock).mockReturnValue(
        llmConfig.PROBLEMATIC_SHUTDOWN_LLM_PROVIDER,
      );

      await gracefulShutdown(mockLLMRouter, mockMongoDBClientFactory);

      // Verify setTimeout was called
      expect(mockSetTimeout).toHaveBeenCalledTimes(1);

      // Get the callback function that was passed to setTimeout
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unnecessary-type-assertion
      const timeoutCallback = (mockSetTimeout as jest.Mock).mock.calls[0][0] as () => void;

      // Mock console.log to verify the warning message
      const mockConsoleLog = jest.spyOn(console, "log").mockImplementation();

      // Execute the callback
      timeoutCallback();

      // Verify that the warning message was logged and process.exit was called
      expect(mockConsoleLog).toHaveBeenCalledWith(
        "Forced exit because GCP client connections caanot be closed properly",
      );
      expect(mockProcessExit).toHaveBeenCalledWith(0);

      // Restore console.log
      mockConsoleLog.mockRestore();
    });

    it("should handle errors from llmRouter.close gracefully", async () => {
      const error = new Error("Failed to close LLM router");
      (mockLLMRouter.close as jest.Mock).mockRejectedValue(error);

      await expect(gracefulShutdown(mockLLMRouter, mockMongoDBClientFactory)).rejects.toThrow(
        "Failed to close LLM router",
      );

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
    });

    it("should handle errors from mongoDBClientFactory.closeAll gracefully", async () => {
      const error = new Error("Failed to close MongoDB connections");
      (mockMongoDBClientFactory.closeAll as jest.Mock).mockRejectedValue(error);

      await expect(gracefulShutdown(mockLLMRouter, mockMongoDBClientFactory)).rejects.toThrow(
        "Failed to close MongoDB connections",
      );

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.getModelFamily).toHaveBeenCalledTimes(1);
      expect(mockMongoDBClientFactory.closeAll).toHaveBeenCalledTimes(1);
    });

    it("should handle errors from llmRouter.getModelFamily gracefully", async () => {
      const error = new Error("Failed to get model family");
      (mockLLMRouter.getModelFamily as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(gracefulShutdown(mockLLMRouter, mockMongoDBClientFactory)).rejects.toThrow(
        "Failed to get model family",
      );

      expect(mockLLMRouter.close).toHaveBeenCalledTimes(1);
      expect(mockLLMRouter.getModelFamily).toHaveBeenCalledTimes(1);
    });
  });
});
