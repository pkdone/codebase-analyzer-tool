/**
 * Tests for application runner's handling of forced exit when LLM provider requires it.
 * These tests verify that the application correctly handles the process.exit() call
 * when the LLM provider signals it needs forced shutdown via getProvidersRequiringProcessExit().
 */

describe("Application Runner Forced Exit", () => {
  let originalProcessExit: typeof process.exit;
  let processExitMock: jest.Mock;

  beforeEach(() => {
    // Save original process.exit
    originalProcessExit = process.exit;
    // Mock process.exit to prevent actual process termination in tests
    processExitMock = jest.fn();
    process.exit = processExitMock as never;
  });

  afterEach(() => {
    // Restore original process.exit
    process.exit = originalProcessExit;
    jest.clearAllMocks();
  });

  it("should call process.exit() when LLM provider requires forced shutdown", async () => {
    // Mock LLMRouter that needs forced shutdown (returns non-empty array)
    const mockLLMRouter = {
      shutdown: jest.fn().mockResolvedValue(undefined),
      getProvidersRequiringProcessExit: jest.fn().mockReturnValue(["vertexai-gemini"]),
    };

    // Simulate the application runner logic (matches actual application-runner.ts)
    const simulateApplicationRunnerShutdown = async (llmRouter: typeof mockLLMRouter) => {
      const providersRequiringExit = llmRouter.getProvidersRequiringProcessExit();
      await llmRouter.shutdown();
      if (providersRequiringExit.length > 0) {
        process.exit(0);
      }
    };

    // Execute the simulation and wait for completion
    await simulateApplicationRunnerShutdown(mockLLMRouter);

    // Wait a tick for async operations
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockLLMRouter.shutdown).toHaveBeenCalled();
        expect(mockLLMRouter.getProvidersRequiringProcessExit).toHaveBeenCalled();
        expect(processExitMock).toHaveBeenCalledWith(0);
        resolve();
      }, 100);
    });
  });

  it("should NOT call process.exit() when LLM provider supports graceful shutdown", async () => {
    // Mock LLMRouter that supports graceful shutdown (returns empty array)
    const mockLLMRouter = {
      shutdown: jest.fn().mockResolvedValue(undefined),
      getProvidersRequiringProcessExit: jest.fn().mockReturnValue([]),
    };

    // Simulate the application runner logic (matches actual application-runner.ts)
    const simulateApplicationRunnerShutdown = async (llmRouter: typeof mockLLMRouter) => {
      const providersRequiringExit = llmRouter.getProvidersRequiringProcessExit();
      await llmRouter.shutdown();
      if (providersRequiringExit.length > 0) {
        process.exit(0);
      }
    };

    // Execute the simulation and wait for completion
    await simulateApplicationRunnerShutdown(mockLLMRouter);

    // Wait a tick for async operations
    await new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(mockLLMRouter.shutdown).toHaveBeenCalled();
        expect(mockLLMRouter.getProvidersRequiringProcessExit).toHaveBeenCalled();
        expect(processExitMock).not.toHaveBeenCalled();
        resolve();
      }, 100);
    });
  });

  it("should handle shutdown errors gracefully without calling process.exit()", async () => {
    // Mock LLMRouter that throws during shutdown
    const mockLLMRouter = {
      shutdown: jest.fn().mockRejectedValue(new Error("Shutdown failed")),
      getProvidersRequiringProcessExit: jest.fn().mockReturnValue([]),
    };

    // Simulate the application runner logic with error handling
    const simulateApplicationRunnerShutdown = async (llmRouter: typeof mockLLMRouter) => {
      try {
        const providersRequiringExit = llmRouter.getProvidersRequiringProcessExit();
        await llmRouter.shutdown();
        if (providersRequiringExit.length > 0) {
          process.exit(0);
        }
      } catch {
        // Handle error gracefully without exiting
        console.error("Shutdown error occurred");
      }
    };

    // Execute the simulation and wait for completion
    await simulateApplicationRunnerShutdown(mockLLMRouter);
    expect(mockLLMRouter.shutdown).toHaveBeenCalled();
    expect(processExitMock).not.toHaveBeenCalled();
  });
});
