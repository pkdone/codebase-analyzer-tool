import LLMRouter from "../../../../src/common/llm/llm-router";
import { LLMModuleConfig } from "../../../../src/common/llm/config/llm-module-config.types";
import { LLMExecutionPipeline } from "../../../../src/common/llm/llm-execution-pipeline";
import { LLMErrorLogger } from "../../../../src/common/llm/tracking/llm-error-logger";
import { ShutdownBehavior } from "../../../../src/common/llm/types/llm.types";

// Mock the manifest loader to avoid actual provider instantiation
jest.mock("../../../../src/common/llm/utils/manifest-loader");

describe("LLMRouter Shutdown Behavior", () => {
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

  it("should not call process.exit() during shutdown", async () => {
    // Create a mock manifest that returns a provider needing forced shutdown
    const mockManifest = {
      providerName: "Test Provider",
      modelFamily: "test",
      envSchema: {} as any,
      models: {
        embeddings: {
          modelKey: "test-embed",
          urnEnvKey: "TEST_EMBED",
          purpose: "embeddings" as const,
          maxTotalTokens: 1000,
        },
        primaryCompletion: {
          modelKey: "test-primary",
          urnEnvKey: "TEST_PRIMARY",
          purpose: "completions" as const,
          maxCompletionTokens: 500,
          maxTotalTokens: 2000,
        },
      },
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 5000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
      implementation: class MockProvider {
        getAvailableCompletionModelQualities() {
          return ["primary"];
        }
        getModelsNames() {
          return { embeddings: "test-embed", primaryCompletion: "test-primary" };
        }
        getModelsMetadata() {
          return {};
        }
        getModelFamily() {
          return "test";
        }
        async close() {}
        getShutdownBehavior() {
          return ShutdownBehavior.REQUIRES_PROCESS_EXIT;
        }
      } as any,
    };

    const {
      loadManifestForModelFamily,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("../../../../src/common/llm/utils/manifest-loader");
    loadManifestForModelFamily.mockReturnValue(mockManifest);

    const config: LLMModuleConfig = {
      modelFamily: "test",
      errorLogging: {
        errorLogDirectory: "test",
        errorLogFilenameTemplate: "test-{timestamp}.log",
      },
      providerParams: {
        TEST_EMBED: "test-embed-model",
        TEST_PRIMARY: "test-primary-model",
      },
      resolvedModels: {
        embeddings: "test-embed-model",
        primaryCompletion: "test-primary-model",
      },
    };

    const mockRetryStrategy = {} as any;
    const mockStats = { recordSuccess: jest.fn(), recordFailure: jest.fn() } as any;
    // Strategies are now pure functions, not classes
    const pipeline = new LLMExecutionPipeline(mockRetryStrategy, mockStats);
    const errorLogger = new LLMErrorLogger(config.errorLogging);
    const router = new LLMRouter(config, pipeline, errorLogger);

    // Call shutdown
    await router.shutdown();

    // Verify process.exit was NOT called by the router
    expect(processExitMock).not.toHaveBeenCalled();
  });

  it("should return REQUIRES_PROCESS_EXIT for providers that need forced shutdown", async () => {
    const mockManifest = {
      providerName: "Test Provider Forced",
      modelFamily: "test-forced",
      envSchema: {} as any,
      models: {
        embeddings: {
          modelKey: "test-embed",
          urnEnvKey: "TEST_EMBED",
          purpose: "embeddings" as const,
          maxTotalTokens: 1000,
        },
        primaryCompletion: {
          modelKey: "test-primary",
          urnEnvKey: "TEST_PRIMARY",
          purpose: "completions" as const,
          maxCompletionTokens: 500,
          maxTotalTokens: 2000,
        },
      },
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 5000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
      implementation: class MockProviderForced {
        getAvailableCompletionModelQualities() {
          return ["primary"];
        }
        getModelsNames() {
          return { embeddings: "test-embed", primaryCompletion: "test-primary" };
        }
        getModelsMetadata() {
          return {};
        }
        getModelFamily() {
          return "test-forced";
        }
        async close() {}
        getShutdownBehavior() {
          return ShutdownBehavior.REQUIRES_PROCESS_EXIT;
        }
      } as any,
    };

    const {
      loadManifestForModelFamily,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("../../../../src/common/llm/utils/manifest-loader");
    loadManifestForModelFamily.mockReturnValue(mockManifest);

    const config: LLMModuleConfig = {
      modelFamily: "test-forced",
      errorLogging: {
        errorLogDirectory: "test",
        errorLogFilenameTemplate: "test-{timestamp}.log",
      },
      providerParams: {
        TEST_EMBED: "test-embed-model",
        TEST_PRIMARY: "test-primary-model",
      },
      resolvedModels: {
        embeddings: "test-embed-model",
        primaryCompletion: "test-primary-model",
      },
    };

    const mockRetryStrategy = {} as any;
    const mockStats = { recordSuccess: jest.fn(), recordFailure: jest.fn() } as any;
    // Strategies are now pure functions, not classes
    const pipeline = new LLMExecutionPipeline(mockRetryStrategy, mockStats);
    const errorLogger = new LLMErrorLogger(config.errorLogging);
    const router = new LLMRouter(config, pipeline, errorLogger);

    // Check that forced shutdown is signaled via enum
    expect(router.getProviderShutdownBehavior()).toBe(ShutdownBehavior.REQUIRES_PROCESS_EXIT);

    await router.shutdown();

    // Even after shutdown, the behavior should still indicate forced shutdown needed
    expect(router.getProviderShutdownBehavior()).toBe(ShutdownBehavior.REQUIRES_PROCESS_EXIT);
  });

  it("should return GRACEFUL for providers that support graceful shutdown", async () => {
    const mockManifest = {
      providerName: "Test Provider No Forced",
      modelFamily: "test-no-forced",
      envSchema: {} as any,
      models: {
        embeddings: {
          modelKey: "test-embed",
          urnEnvKey: "TEST_EMBED",
          purpose: "embeddings" as const,
          maxTotalTokens: 1000,
        },
        primaryCompletion: {
          modelKey: "test-primary",
          urnEnvKey: "TEST_PRIMARY",
          purpose: "completions" as const,
          maxCompletionTokens: 500,
          maxTotalTokens: 2000,
        },
      },
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 5000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
      implementation: class MockProviderNoForced {
        getAvailableCompletionModelQualities() {
          return ["primary"];
        }
        getModelsNames() {
          return { embeddings: "test-embed", primaryCompletion: "test-primary" };
        }
        getModelsMetadata() {
          return {};
        }
        getModelFamily() {
          return "test-no-forced";
        }
        async close() {}
        getShutdownBehavior() {
          return ShutdownBehavior.GRACEFUL;
        }
      } as any,
    };

    const {
      loadManifestForModelFamily,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("../../../../src/common/llm/utils/manifest-loader");
    loadManifestForModelFamily.mockReturnValue(mockManifest);

    const config: LLMModuleConfig = {
      modelFamily: "test-no-forced",
      errorLogging: {
        errorLogDirectory: "test",
        errorLogFilenameTemplate: "test-{timestamp}.log",
      },
      providerParams: {
        TEST_EMBED: "test-embed-model",
        TEST_PRIMARY: "test-primary-model",
      },
      resolvedModels: {
        embeddings: "test-embed-model",
        primaryCompletion: "test-primary-model",
      },
    };

    const mockRetryStrategy = {} as any;
    const mockStats = { recordSuccess: jest.fn(), recordFailure: jest.fn() } as any;
    // Strategies are now pure functions, not classes
    const pipeline = new LLMExecutionPipeline(mockRetryStrategy, mockStats);
    const errorLogger = new LLMErrorLogger(config.errorLogging);
    const router = new LLMRouter(config, pipeline, errorLogger);

    expect(router.getProviderShutdownBehavior()).toBe(ShutdownBehavior.GRACEFUL);
  });
});
