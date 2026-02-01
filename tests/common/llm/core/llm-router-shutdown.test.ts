import LLMRouter from "../../../../src/common/llm/llm-router";
import type { LLMModuleConfig } from "../../../../src/common/llm/config/llm-module-config.types";
import { ShutdownBehavior } from "../../../../src/common/llm/types/llm-shutdown.types";

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
    process.exit = processExitMock as never;
  });

  afterEach(() => {
    // Restore original process.exit
    process.exit = originalProcessExit;
    jest.clearAllMocks();
  });

  it("should not call process.exit() during shutdown", async () => {
    // Create a mock manifest that returns a provider needing forced shutdown
    const mockManifest = {
      providerFamily: "test",
      envSchema: {} as never,
      models: {
        embeddings: [
          {
            modelKey: "test-embed",
            urnEnvKey: "TEST_EMBED",
            purpose: "embeddings" as const,
            maxTotalTokens: 1000,
            dimensions: 1536,
          },
        ],
        completions: [
          {
            modelKey: "test-primary",
            urnEnvKey: "TEST_PRIMARY",
            purpose: "completions" as const,
            maxCompletionTokens: 500,
            maxTotalTokens: 2000,
          },
        ],
      },
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 5000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
      extractConfig: () => ({}),
      implementation: class MockProvider {
        getAvailableModelNames() {
          return { embeddings: ["test-embed"], completions: ["test-primary"] };
        }
        getModelsNames() {
          return { embeddings: ["test-embed"], completions: ["test-primary"] };
        }
        getModelsMetadata() {
          return {};
        }
        getProviderFamily() {
          return "test";
        }
        async close() {}
        getShutdownBehavior() {
          return ShutdownBehavior.REQUIRES_PROCESS_EXIT;
        }
      } as never,
    };

    const {
      loadManifestForProviderFamily,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("../../../../src/common/llm/utils/manifest-loader");
    loadManifestForProviderFamily.mockReturnValue(mockManifest);

    // Create mock provider registry
    const mockProviderRegistry = new Map([["test", mockManifest]]);

    const config: LLMModuleConfig = {
      errorLogging: {
        errorLogDirectory: "test",
        errorLogFilenameTemplate: "test-{timestamp}.log",
      },
      providerParams: {
        TEST_EMBED: "test-embed-model",
        TEST_PRIMARY: "test-primary-model",
      },
      resolvedModelChain: {
        embeddings: [
          { providerFamily: "test", modelKey: "test-embed", modelUrn: "test-embed-model" },
        ],
        completions: [
          { providerFamily: "test", modelKey: "test-primary", modelUrn: "test-primary-model" },
        ],
      },
      providerRegistry: mockProviderRegistry,
    };

    // Router now creates its own execution pipeline internally
    const router = new LLMRouter(config);

    // Call shutdown
    await router.shutdown();

    // Verify process.exit was NOT called by the router
    expect(processExitMock).not.toHaveBeenCalled();
  });

  it("should return provider names for providers that need forced shutdown", async () => {
    const mockManifest = {
      providerFamily: "test",
      envSchema: {} as never,
      models: {
        embeddings: [
          {
            modelKey: "test-embed",
            urnEnvKey: "TEST_EMBED",
            purpose: "embeddings" as const,
            maxTotalTokens: 1000,
            dimensions: 1536,
          },
        ],
        completions: [
          {
            modelKey: "test-primary",
            urnEnvKey: "TEST_PRIMARY",
            purpose: "completions" as const,
            maxCompletionTokens: 500,
            maxTotalTokens: 2000,
          },
        ],
      },
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 5000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
      extractConfig: () => ({}),
      implementation: class MockProviderForced {
        getAvailableModelNames() {
          return { embeddings: ["test-embed"], completions: ["test-primary"] };
        }
        getModelsNames() {
          return { embeddings: ["test-embed"], completions: ["test-primary"] };
        }
        getModelsMetadata() {
          return {};
        }
        getProviderFamily() {
          return "test-forced";
        }
        async close() {}
        getShutdownBehavior() {
          return ShutdownBehavior.REQUIRES_PROCESS_EXIT;
        }
      } as never,
    };

    const {
      loadManifestForProviderFamily,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("../../../../src/common/llm/utils/manifest-loader");
    loadManifestForProviderFamily.mockReturnValue(mockManifest);

    // Create mock provider registry
    const mockProviderRegistry = new Map([["test", mockManifest]]);

    const config: LLMModuleConfig = {
      errorLogging: {
        errorLogDirectory: "test",
        errorLogFilenameTemplate: "test-{timestamp}.log",
      },
      providerParams: {
        TEST_EMBED: "test-embed-model",
        TEST_PRIMARY: "test-primary-model",
      },
      resolvedModelChain: {
        embeddings: [
          { providerFamily: "test", modelKey: "test-embed", modelUrn: "test-embed-model" },
        ],
        completions: [
          { providerFamily: "test", modelKey: "test-primary", modelUrn: "test-primary-model" },
        ],
      },
      providerRegistry: mockProviderRegistry,
    };

    // Router now creates its own execution pipeline internally
    const router = new LLMRouter(config);

    // Check that forced shutdown is signaled via non-empty array
    const providersRequiringExit = router.getProvidersRequiringProcessExit();
    expect(providersRequiringExit.length).toBeGreaterThan(0);
    expect(providersRequiringExit).toContain("test");

    await router.shutdown();
  });

  it("should return empty array for providers that support graceful shutdown", async () => {
    const mockManifest = {
      providerFamily: "test",
      envSchema: {} as never,
      models: {
        embeddings: [
          {
            modelKey: "test-embed",
            urnEnvKey: "TEST_EMBED",
            purpose: "embeddings" as const,
            maxTotalTokens: 1000,
            dimensions: 1536,
          },
        ],
        completions: [
          {
            modelKey: "test-primary",
            urnEnvKey: "TEST_PRIMARY",
            purpose: "completions" as const,
            maxCompletionTokens: 500,
            maxTotalTokens: 2000,
          },
        ],
      },
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 5000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
      extractConfig: () => ({}),
      implementation: class MockProviderNoForced {
        getAvailableModelNames() {
          return { embeddings: ["test-embed"], completions: ["test-primary"] };
        }
        getModelsNames() {
          return { embeddings: ["test-embed"], completions: ["test-primary"] };
        }
        getModelsMetadata() {
          return {};
        }
        getProviderFamily() {
          return "test-no-forced";
        }
        async close() {}
        getShutdownBehavior() {
          return ShutdownBehavior.GRACEFUL;
        }
      } as never,
    };

    const {
      loadManifestForProviderFamily,
      // eslint-disable-next-line @typescript-eslint/no-require-imports
    } = require("../../../../src/common/llm/utils/manifest-loader");
    loadManifestForProviderFamily.mockReturnValue(mockManifest);

    // Create mock provider registry
    const mockProviderRegistry = new Map([["test", mockManifest]]);

    const config: LLMModuleConfig = {
      errorLogging: {
        errorLogDirectory: "test",
        errorLogFilenameTemplate: "test-{timestamp}.log",
      },
      providerParams: {
        TEST_EMBED: "test-embed-model",
        TEST_PRIMARY: "test-primary-model",
      },
      resolvedModelChain: {
        embeddings: [
          { providerFamily: "test", modelKey: "test-embed", modelUrn: "test-embed-model" },
        ],
        completions: [
          { providerFamily: "test", modelKey: "test-primary", modelUrn: "test-primary-model" },
        ],
      },
      providerRegistry: mockProviderRegistry,
    };

    // Router now creates its own execution pipeline internally
    const router = new LLMRouter(config);

    expect(router.getProvidersRequiringProcessExit()).toEqual([]);
  });
});
