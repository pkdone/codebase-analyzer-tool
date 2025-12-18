import AbstractLLM from "../../../../src/common/llm/providers/abstract-llm";
import type {
  ProviderInit,
  LLMImplSpecificResponseSummary,
} from "../../../../src/common/llm/providers/llm-provider.types";
import { LLMPurpose } from "../../../../src/common/llm/types/llm.types";
import type { IErrorLogger } from "../../../../src/common/llm/tracking/llm-error-logger.interface";
import { z } from "zod";

/**
 * Tests for refactored provider initialization using ProviderInit object.
 */
describe("Provider Init Refactoring", () => {
  // Mock error logger
  const mockErrorLogger: IErrorLogger = {
    recordJsonProcessingError: jest.fn().mockResolvedValue(undefined),
  };

  // Test provider extending AbstractLLM
  class TestProvider extends AbstractLLM {
    protected async invokeEmbeddingProvider(): Promise<LLMImplSpecificResponseSummary> {
      return {
        isIncompleteResponse: false,
        responseContent: [0.1, 0.2, 0.3],
        tokenUsage: { promptTokens: 10, completionTokens: 0, maxTotalTokens: 1000 },
      };
    }

    protected async invokeCompletionProvider(): Promise<LLMImplSpecificResponseSummary> {
      return {
        isIncompleteResponse: false,
        responseContent: "test response",
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

  const createTestInit = (includeSecondary = false): ProviderInit => ({
    manifest: {
      providerName: "Test Provider",
      modelFamily: "test-family",
      envSchema: z.object({}),
      models: {
        embeddings: {
          modelKey: "test-embed",
          urnEnvKey: "TEST_EMBED_URN",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: 1000,
        },
        primaryCompletion: {
          modelKey: "test-primary",
          urnEnvKey: "TEST_PRIMARY_URN",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 500,
          maxTotalTokens: 2000,
        },
        ...(includeSecondary && {
          secondaryCompletion: {
            modelKey: "test-secondary",
            urnEnvKey: "TEST_SECONDARY_URN",
            purpose: LLMPurpose.COMPLETIONS,
            maxCompletionTokens: 250,
            maxTotalTokens: 1000,
          },
        }),
      },
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 5000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
        temperature: 0.0,
      },
      implementation: TestProvider,
    },
    providerParams: {
      API_KEY: "test-api-key",
    },
    resolvedModels: {
      embeddings: "test-embed-urn",
      primaryCompletion: "test-primary-urn",
      ...(includeSecondary && { secondaryCompletion: "test-secondary-urn" }),
    },
    errorLogger: mockErrorLogger,
  });

  it("should accept ProviderInit object in constructor", () => {
    const init = createTestInit();

    expect(() => {
      new TestProvider(init);
    }).not.toThrow();
  });

  it("should correctly initialize all fields from ProviderInit", () => {
    const init = createTestInit();
    const provider = new TestProvider(init);

    // Access protected fields via type assertion for testing
    const llmModelsMetadata = (provider as any).llmModelsMetadata;
    const providerSpecificConfig = (provider as any).providerSpecificConfig;
    const providerParams = (provider as any).providerParams;
    const modelsKeys = (provider as any).modelsKeys;
    const modelFamily = (provider as any).modelFamily;

    expect(llmModelsMetadata).toBeDefined();
    expect(llmModelsMetadata["test-embed"]).toBeDefined();
    expect(llmModelsMetadata["test-embed"].urn).toBe("test-embed-urn");
    expect(llmModelsMetadata["test-primary"]).toBeDefined();
    expect(llmModelsMetadata["test-primary"].urn).toBe("test-primary-urn");

    expect(providerSpecificConfig).toEqual(init.manifest.providerSpecificConfig);
    expect(providerParams).toEqual(init.providerParams);
    expect(modelFamily).toBe("test-family");

    expect(modelsKeys.embeddingsModelKey).toBe("test-embed");
    expect(modelsKeys.primaryCompletionModelKey).toBe("test-primary");
  });

  it("should work with secondary completion model", () => {
    const init = createTestInit(true);
    const provider = new TestProvider(init);

    const llmModelsMetadata = (provider as any).llmModelsMetadata;
    const modelsKeys = (provider as any).modelsKeys;

    expect(llmModelsMetadata["test-secondary"]).toBeDefined();
    expect(llmModelsMetadata["test-secondary"].urn).toBe("test-secondary-urn");
    expect(modelsKeys.secondaryCompletionModelKey).toBe("test-secondary");
  });

  it("should work without secondary completion model", () => {
    const init = createTestInit(false);
    const provider = new TestProvider(init);

    const llmModelsMetadata = (provider as any).llmModelsMetadata;
    const modelsKeys = (provider as any).modelsKeys;

    expect(llmModelsMetadata["test-secondary"]).toBeUndefined();
    expect(modelsKeys.secondaryCompletionModelKey).toBeUndefined();
  });

  it("should store provider params for access by subclasses", () => {
    const init = createTestInit();
    const provider = new TestProvider(init);

    const providerParams = (provider as any).providerParams;

    expect(providerParams).toBeDefined();
    expect(providerParams.API_KEY).toBe("test-api-key");
  });

  it("should correctly derive models keys from manifest", () => {
    const init = createTestInit(true);
    const provider = new TestProvider(init);

    const modelsKeys = (provider as any).modelsKeys;

    expect(modelsKeys).toEqual({
      embeddingsModelKey: "test-embed",
      primaryCompletionModelKey: "test-primary",
      secondaryCompletionModelKey: "test-secondary",
    });
  });

  it("should provide access to model metadata through getModelsMetadata", () => {
    const init = createTestInit();
    const provider = new TestProvider(init);

    const metadata = provider.getModelsMetadata();

    expect(metadata["test-embed"]).toBeDefined();
    expect(metadata["test-embed"].urn).toBe("test-embed-urn");
    expect(metadata["test-primary"]).toBeDefined();
    expect(metadata["test-primary"].urn).toBe("test-primary-urn");
  });

  it("should provide access to available completion qualities", () => {
    const init = createTestInit(true);
    const provider = new TestProvider(init);

    const qualities = provider.getAvailableCompletionModelQualities();

    expect(qualities).toContain("primary");
    expect(qualities).toContain("secondary");
  });

  it("should handle manifest without features array", () => {
    const init = createTestInit();
    // Ensure no features property in manifest
    expect((init.manifest as any).features).toBeUndefined();

    const provider = new TestProvider(init);

    // Should not have llmFeatures field anymore
    expect((provider as any).llmFeatures).toBeUndefined();
  });
});
