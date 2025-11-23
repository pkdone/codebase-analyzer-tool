import "reflect-metadata";
import { LLMProviderManager } from "../../../src/llm/core/llm-provider-manager";
import { LLMProviderManifest } from "../../../src/llm/providers/llm-provider.types";
import { LLMPurpose } from "../../../src/llm/types/llm.types";
import { createMockJsonProcessor } from "../../helpers/llm/json-processor-mock";

describe("LLMProviderManager - llmFeatures", () => {
  let manager: LLMProviderManager;

  beforeEach(() => {
    // Use a real provider family, then override manifest for testing
    manager = new LLMProviderManager("openai", createMockJsonProcessor());
  });

  it("should attach llmFeatures to provider instance when manifest has features", () => {
    const features: readonly string[] = ["fixed_temperature", "max_completion_tokens"];
    const mockManifest: LLMProviderManifest = {
      modelFamily: "testFamily",
      providerName: "Test Provider",
      envSchema: {} as any,
      models: {
        embeddings: {
          modelKey: "test-embeddings",
          purpose: LLMPurpose.EMBEDDINGS,
          urnEnvKey: "TEST_EMBEDDINGS_MODEL",
          maxTotalTokens: 8192,
        },
        primaryCompletion: {
          modelKey: "test-completion",
          purpose: LLMPurpose.COMPLETIONS,
          urnEnvKey: "TEST_COMPLETION_MODEL",
          maxTotalTokens: 8192,
          maxCompletionTokens: 4096,
        },
      },
      implementation: jest.fn().mockImplementation((...args) => {
        const instance = {} as any;
        // Simulate AbstractLLM constructor behavior
        const llmFeatures = args[7]; // 8th argument is llmFeatures
        if (llmFeatures) {
          instance.llmFeatures = llmFeatures;
        }
        return instance;
      }) as any,
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
      features,
    };

    (manager as any).manifest = mockManifest;
    (manager as any).isInitialized = true;

    const mockEnv = {
      TEST_EMBEDDINGS_MODEL: "embeddings-urn",
      TEST_COMPLETION_MODEL: "completion-urn",
    } as any;

    const provider = manager.getLLMProvider(mockEnv);

    expect(provider.llmFeatures).toBeDefined();
    expect(provider.llmFeatures).toEqual(features);
    expect(mockManifest.implementation).toHaveBeenCalledWith(
      mockEnv,
      expect.any(Object),
      expect.any(Object),
      mockManifest.errorPatterns,
      { providerSpecificConfig: mockManifest.providerSpecificConfig },
      expect.any(Object),
      mockManifest.modelFamily,
      features,
    );
  });

  it("should not attach llmFeatures when manifest has no features", () => {
    const mockManifest: LLMProviderManifest = {
      modelFamily: "testFamily",
      providerName: "Test Provider",
      envSchema: {} as any,
      models: {
        embeddings: {
          modelKey: "test-embeddings",
          purpose: LLMPurpose.EMBEDDINGS,
          urnEnvKey: "TEST_EMBEDDINGS_MODEL",
          maxTotalTokens: 8192,
        },
        primaryCompletion: {
          modelKey: "test-completion",
          purpose: LLMPurpose.COMPLETIONS,
          urnEnvKey: "TEST_COMPLETION_MODEL",
          maxTotalTokens: 8192,
          maxCompletionTokens: 4096,
        },
      },
      implementation: jest.fn().mockImplementation((...args) => {
        const instance = {} as any;
        const llmFeatures = args[7];
        if (llmFeatures) {
          instance.llmFeatures = llmFeatures;
        }
        return instance;
      }) as any,
      errorPatterns: [],
      providerSpecificConfig: {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 5000,
      },
    };

    (manager as any).manifest = mockManifest;
    (manager as any).isInitialized = true;

    const mockEnv = {
      TEST_EMBEDDINGS_MODEL: "embeddings-urn",
      TEST_COMPLETION_MODEL: "completion-urn",
    } as any;

    const provider = manager.getLLMProvider(mockEnv);

    expect(provider.llmFeatures).toBeUndefined();
    expect(mockManifest.implementation).toHaveBeenCalledWith(
      mockEnv,
      expect.any(Object),
      expect.any(Object),
      mockManifest.errorPatterns,
      { providerSpecificConfig: mockManifest.providerSpecificConfig },
      expect.any(Object),
      mockManifest.modelFamily,
      undefined,
    );
  });
});
