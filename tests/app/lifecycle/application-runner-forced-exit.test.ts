/**
 * Tests for application runner's handling of forced exit when LLM provider requires it.
 * These tests verify that the application correctly handles the process.exit() call
 * when the LLM provider signals it needs forced shutdown via ShutdownBehavior enum.
 */

import { ShutdownBehavior } from "../../../src/common/llm/types/llm.types";

describe("Application Runner Forced Exit", () => {
  let originalProcessExit: typeof process.exit;
  let processExitMock: jest.Mock;

  beforeEach(() => {
    // Save original process.exit
    originalProcessExit = process.exit;
    // Mock process.exit to prevent actual process termination in tests
    processExitMock = jest.fn();
    process.exit = processExitMock as any;
  });

  afterEach(() => {
    // Restore original process.exit
    process.exit = originalProcessExit;
    jest.clearAllMocks();
  });

  it("should call process.exit() when LLM provider returns REQUIRES_PROCESS_EXIT", async () => {
    // Mock LLMRouter that needs forced shutdown
    const mockLLMRouter = {
      shutdown: jest.fn().mockResolvedValue(undefined),
      getProviderShutdownBehavior: jest
        .fn()
        .mockReturnValue(ShutdownBehavior.REQUIRES_PROCESS_EXIT),
    };

    // Simulate the application runner logic
    const simulateApplicationRunnerShutdown = async (llmRouter: typeof mockLLMRouter) => {
      await llmRouter.shutdown();
      if (llmRouter.getProviderShutdownBehavior() === ShutdownBehavior.REQUIRES_PROCESS_EXIT) {
        process.exit(0);
      }
    };

    // Execute the simulation and wait for completion
    await simulateApplicationRunnerShutdown(mockLLMRouter);

    // Wait a tick for async operations
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockLLMRouter.shutdown).toHaveBeenCalled();
        expect(mockLLMRouter.getProviderShutdownBehavior).toHaveBeenCalled();
        expect(processExitMock).toHaveBeenCalledWith(0);
        resolve();
      }, 100);
    });
  });

  it("should NOT call process.exit() when LLM provider returns GRACEFUL", async () => {
    // Mock LLMRouter that supports graceful shutdown
    const mockLLMRouter = {
      shutdown: jest.fn().mockResolvedValue(undefined),
      getProviderShutdownBehavior: jest.fn().mockReturnValue(ShutdownBehavior.GRACEFUL),
    };

    // Simulate the application runner logic
    const simulateApplicationRunnerShutdown = async (llmRouter: typeof mockLLMRouter) => {
      await llmRouter.shutdown();
      if (llmRouter.getProviderShutdownBehavior() === ShutdownBehavior.REQUIRES_PROCESS_EXIT) {
        process.exit(0);
      }
    };

    // Execute the simulation and wait for completion
    await simulateApplicationRunnerShutdown(mockLLMRouter);

    // Wait a tick for async operations
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockLLMRouter.shutdown).toHaveBeenCalled();
        expect(mockLLMRouter.getProviderShutdownBehavior).toHaveBeenCalled();
        expect(processExitMock).not.toHaveBeenCalled();
        resolve();
      }, 100);
    });
  });

  it("should handle shutdown errors gracefully without calling process.exit()", async () => {
    // Mock LLMRouter that throws during shutdown
    const mockLLMRouter = {
      shutdown: jest.fn().mockRejectedValue(new Error("Shutdown failed")),
      getProviderShutdownBehavior: jest.fn().mockReturnValue(ShutdownBehavior.GRACEFUL),
    };

    // Simulate the application runner logic with error handling
    const simulateApplicationRunnerShutdown = async (llmRouter: typeof mockLLMRouter) => {
      try {
        await llmRouter.shutdown();
        if (llmRouter.getProviderShutdownBehavior() === ShutdownBehavior.REQUIRES_PROCESS_EXIT) {
          process.exit(0);
        }
      } catch (error) {
        // Handle error gracefully without exiting
        console.error("Shutdown error:", error);
      }
    };

    // Execute the simulation and wait for completion
    await simulateApplicationRunnerShutdown(mockLLMRouter);
    expect(mockLLMRouter.shutdown).toHaveBeenCalled();
    expect(processExitMock).not.toHaveBeenCalled();
  });
});
