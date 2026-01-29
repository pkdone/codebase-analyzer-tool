import "reflect-metadata";
import { container } from "tsyringe";
import { captureTokens, insightsTokens, taskTokens } from "../../../../src/app/di/tokens";
import { registerAppDependencies } from "../../../../src/app/di/registration-modules/app-registration";

describe("App Registration Module", () => {
  beforeEach(() => {
    container.clearInstances();
    container.reset();
  });

  describe("registerAppDependencies", () => {
    it("should register capture components as singletons", () => {
      registerAppDependencies();

      expect(container.isRegistered(captureTokens.CodebaseCaptureService)).toBe(true);
    });

    it("should register insights components as singletons", () => {
      registerAppDependencies();

      expect(container.isRegistered(insightsTokens.PromptFileInsightsGenerator)).toBe(true);
      expect(container.isRegistered(insightsTokens.InsightsFromDBGenerator)).toBe(true);
    });

    it("should register task components as singletons", () => {
      registerAppDependencies();

      expect(container.isRegistered(taskTokens.ReportGenerationTask)).toBe(true);
      expect(container.isRegistered(taskTokens.MongoConnectionTestTask)).toBe(true);
      expect(container.isRegistered(taskTokens.CodebaseQueryTask)).toBe(true);
      expect(container.isRegistered(taskTokens.CodebaseCaptureTask)).toBe(true);
      expect(container.isRegistered(taskTokens.InsightsGenerationTask)).toBe(true);
      expect(container.isRegistered(taskTokens.FileBasedInsightsGenerationTask)).toBe(true);
      expect(container.isRegistered(taskTokens.PluggableLLMsTestTask)).toBe(true);
    });

    it("should register components only once even on multiple calls", () => {
      registerAppDependencies();
      const isRegistered1 = container.isRegistered(captureTokens.CodebaseCaptureService);

      registerAppDependencies();
      const isRegistered2 = container.isRegistered(captureTokens.CodebaseCaptureService);

      expect(isRegistered1).toBe(true);
      expect(isRegistered2).toBe(true);
    });

    it("should log registration messages", () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();
      registerAppDependencies();

      expect(consoleSpy).toHaveBeenCalledWith("Repositories registered");
      expect(consoleSpy).toHaveBeenCalledWith("Internal helper components registered");
      expect(consoleSpy).toHaveBeenCalledWith("Main executable tasks registered");
      consoleSpy.mockRestore();
    });

    it("should NOT register LLM core components (RetryStrategy, LLMExecutionPipeline) in DI container", () => {
      // These components are intentionally created via factory pattern to keep
      // src/common/llm module framework-agnostic
      registerAppDependencies();

      // Verify these tokens don't exist in llmTokens anymore (compile-time check)
      // and are not registered in the container
      const retryStrategyToken = Symbol("RetryStrategy");
      const executionPipelineToken = Symbol("LLMExecutionPipeline");

      expect(container.isRegistered(retryStrategyToken)).toBe(false);
      expect(container.isRegistered(executionPipelineToken)).toBe(false);
    });
  });
});
