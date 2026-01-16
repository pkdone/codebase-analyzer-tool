import { LLMPurpose } from "../../../../src/common/llm/types/llm.types";
import type {
  LLMProviderSpecificConfig,
  ProviderInit,
} from "../../../../src/common/llm/providers/llm-provider.types";
import BaseLLMProvider from "../../../../src/common/llm/providers/base-llm-provider";
import { z } from "zod";

/**
 * Tests for provider constructor signatures using ProviderInit pattern.
 * Verifies that providers can be instantiated with the ProviderInit configuration object.
 */
describe("Provider Constructor Signatures", () => {
  // Test provider extending BaseLLMProvider
  class TestProvider extends BaseLLMProvider {
    protected async invokeEmbeddingProvider() {
      return {
        isIncompleteResponse: false,
        responseContent: [0.1, 0.2],
        tokenUsage: { promptTokens: 10, completionTokens: 0, maxTotalTokens: 1000 },
      };
    }

    protected async invokeCompletionProvider() {
      return {
        isIncompleteResponse: false,
        responseContent: "test",
        tokenUsage: { promptTokens: 10, completionTokens: 20, maxTotalTokens: 1000 },
      };
    }

    protected isLLMOverloaded(): boolean {
      return false;
    }

    protected isTokenLimitExceeded(): boolean {
      return false;
    }
  }

  const providerSpecificConfig: LLMProviderSpecificConfig = {
    requestTimeoutMillis: 5000,
    maxRetryAttempts: 3,
    minRetryDelayMillis: 1000,
    maxRetryDelayMillis: 5000,
    temperature: 0.0,
  };

  const createInit = (): ProviderInit => ({
    manifest: {
      providerName: "Test Provider",
      modelFamily: "test-family",
      envSchema: z.object({}),
      models: {
        embeddings: {
          modelKey: "test-embed",
          name: "Test Embeddings",
          urnEnvKey: "TEST_EMBED",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: 1000,
        },
        primaryCompletion: {
          modelKey: "test-primary",
          name: "Test Primary",
          urnEnvKey: "TEST_PRIMARY",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 500,
          maxTotalTokens: 2000,
        },
      },
      errorPatterns: [],
      providerSpecificConfig,
      implementation: TestProvider,
    },
    providerParams: {},
    resolvedModels: {
      embeddings: "test-embed-urn",
      primaryCompletion: "test-primary-urn",
    },
    errorLogging: {
      errorLogDirectory: "/tmp/test-errors",
      errorLogFilenameTemplate: "error-{timestamp}.log",
    },
  });

  it("should accept ProviderInit object", () => {
    const init = createInit();

    expect(() => {
      new TestProvider(init);
    }).not.toThrow();
  });

  it("should correctly propagate providerSpecificConfig to the provider", () => {
    const init = createInit();
    const provider = new TestProvider(init);

    // Access protected field via type assertion for testing
    const config = (provider as any).providerSpecificConfig;
    expect(config.temperature).toBe(0.0);
    expect(config.requestTimeoutMillis).toBe(5000);
  });

  it("should correctly propagate providerParams to the provider", () => {
    const init = createInit();
    init.providerParams = { API_KEY: "test-key" };
    const provider = new TestProvider(init);

    // Access protected field via type assertion for testing
    const params = (provider as any).providerParams;
    expect(params.API_KEY).toBe("test-key");
  });

  it("should build models metadata from init", () => {
    const init = createInit();
    const provider = new TestProvider(init);

    const metadata = provider.getModelsMetadata();
    expect(metadata["test-embed"]).toBeDefined();
    expect(metadata["test-embed"].urn).toBe("test-embed-urn");
    expect(metadata["test-primary"]).toBeDefined();
    expect(metadata["test-primary"].urn).toBe("test-primary-urn");
  });

  it("should handle manifest without features array", () => {
    const init = createInit();
    // Features array no longer exists
    expect((init.manifest as any).features).toBeUndefined();

    const provider = new TestProvider(init);

    // llmFeatures field no longer exists on provider
    expect((provider as any).llmFeatures).toBeUndefined();
  });
});
