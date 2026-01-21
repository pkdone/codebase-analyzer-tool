import BaseLLMProvider from "../../../../src/common/llm/providers/base-llm-provider";
import type {
  ProviderInit,
  LLMImplSpecificResponseSummary,
} from "../../../../src/common/llm/providers/llm-provider.types";
import { LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import { z } from "zod";

/**
 * Tests for refactored provider initialization using ProviderInit object.
 */
describe("Provider Init Refactoring", () => {
  // Test provider extending BaseLLMProvider
  class TestProvider extends BaseLLMProvider {
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
      providerFamily: "test-provider",
      envSchema: z.object({}),
      models: {
        embeddings: [
          {
            modelKey: "test-embed",
            urnEnvKey: "TEST_EMBED_URN",
            purpose: LLMPurpose.EMBEDDINGS,
            maxTotalTokens: 1000,
            dimensions: 1536,
          },
        ],
        completions: includeSecondary
          ? [
              {
                modelKey: "test-primary",
                urnEnvKey: "TEST_PRIMARY_URN",
                purpose: LLMPurpose.COMPLETIONS,
                maxCompletionTokens: 500,
                maxTotalTokens: 2000,
              },
              {
                modelKey: "test-secondary",
                urnEnvKey: "TEST_SECONDARY_URN",
                purpose: LLMPurpose.COMPLETIONS,
                maxCompletionTokens: 250,
                maxTotalTokens: 1000,
              },
            ]
          : [
              {
                modelKey: "test-primary",
                urnEnvKey: "TEST_PRIMARY_URN",
                purpose: LLMPurpose.COMPLETIONS,
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
        temperature: 0.0,
      },
      implementation: TestProvider,
    },
    providerParams: {
      API_KEY: "test-api-key",
    },
    resolvedModelChain: {
      embeddings: [
        { providerFamily: "test-provider", modelKey: "test-embed", modelUrn: "test-embed-urn" },
      ],
      completions: [
        { providerFamily: "test-provider", modelKey: "test-primary", modelUrn: "test-primary-urn" },
        ...(includeSecondary
          ? [
              {
                providerFamily: "test-provider",
                modelKey: "test-secondary",
                modelUrn: "test-secondary-urn",
              },
            ]
          : []),
      ],
    },
    errorLogging: {
      errorLogDirectory: "/tmp/test-errors",
      errorLogFilenameTemplate: "error-{timestamp}.log",
    },
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
    const providerFamily = (provider as any).providerFamily;

    expect(llmModelsMetadata).toBeDefined();
    expect(llmModelsMetadata["test-embed"]).toBeDefined();
    expect(llmModelsMetadata["test-embed"].urn).toBe("test-embed-urn");
    expect(llmModelsMetadata["test-primary"]).toBeDefined();
    expect(llmModelsMetadata["test-primary"].urn).toBe("test-primary-urn");

    expect(providerSpecificConfig).toEqual(init.manifest.providerSpecificConfig);
    expect(providerParams).toEqual(init.providerParams);
    expect(providerFamily).toBe("test-provider");
  });

  it("should work with secondary completion model", () => {
    const init = createTestInit(true);
    const provider = new TestProvider(init);

    const llmModelsMetadata = (provider as any).llmModelsMetadata;

    expect(llmModelsMetadata["test-secondary"]).toBeDefined();
    expect(llmModelsMetadata["test-secondary"].urn).toBe("test-secondary-urn");
  });

  it("should work without secondary completion model", () => {
    const init = createTestInit(false);
    const provider = new TestProvider(init);

    const llmModelsMetadata = (provider as any).llmModelsMetadata;

    expect(llmModelsMetadata["test-secondary"]).toBeUndefined();
  });

  it("should store provider params for access by subclasses", () => {
    const init = createTestInit();
    const provider = new TestProvider(init);

    const providerParams = (provider as any).providerParams;

    expect(providerParams).toBeDefined();
    expect(providerParams.API_KEY).toBe("test-api-key");
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

  it("should provide access to available completion model keys", () => {
    const init = createTestInit(true);
    const provider = new TestProvider(init);

    const keys = provider.getAvailableCompletionModelKeys();

    expect(keys).toContain("test-primary");
    expect(keys).toContain("test-secondary");
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
