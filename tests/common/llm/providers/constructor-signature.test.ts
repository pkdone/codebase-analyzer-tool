import {
  LLMModelKeysSet,
  LLMPurpose,
  ResolvedLLMModelMetadata,
} from "../../../../src/common/llm/types/llm.types";
import { LLMProviderSpecificConfig } from "../../../../src/common/llm/providers/llm-provider.types";
import AbstractLLM from "../../../../src/common/llm/providers/abstract-llm";
import { IErrorLogger } from "../../../../src/common/llm/tracking/llm-error-logger.interface";

/**
 * Tests for simplified provider constructor signatures.
 * Verifies that providers can be instantiated with the direct providerSpecificConfig
 * parameter instead of the wrapped config object.
 */
describe("Provider Constructor Signatures", () => {
  // Mock error logger
  const mockErrorLogger: IErrorLogger = {
    recordJsonProcessingError: jest.fn().mockResolvedValue(undefined),
  };

  // Test provider extending AbstractLLM
  class TestProvider extends AbstractLLM {
    protected async invokeProvider() {
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

  const modelsKeys: LLMModelKeysSet = {
    embeddingsModelKey: "test-embed",
    primaryCompletionModelKey: "test-primary",
  };

  const modelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    "test-embed": {
      modelKey: "test-embed",
      urn: "test-embed-urn",
      purpose: LLMPurpose.EMBEDDINGS,
      maxTotalTokens: 1000,
    },
    "test-primary": {
      modelKey: "test-primary",
      urn: "test-primary-urn",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 500,
      maxTotalTokens: 2000,
    },
  };

  const errorPatterns: readonly [] = [];

  const providerSpecificConfig: LLMProviderSpecificConfig = {
    requestTimeoutMillis: 5000,
    maxRetryAttempts: 3,
    minRetryDelayMillis: 1000,
    maxRetryDelayMillis: 5000,
    temperature: 0.0,
  };

  const modelFamily = "test-family";

  it("should accept providerSpecificConfig directly without wrapper object", () => {
    expect(() => {
      new TestProvider(
        modelsKeys,
        modelsMetadata,
        errorPatterns,
        providerSpecificConfig, // Direct parameter, not wrapped
        modelFamily,
        mockErrorLogger,
      );
    }).not.toThrow();
  });

  it("should correctly propagate providerSpecificConfig to the provider", () => {
    const provider = new TestProvider(
      modelsKeys,
      modelsMetadata,
      errorPatterns,
      providerSpecificConfig,
      modelFamily,
      mockErrorLogger,
    );

    // Access protected field via type assertion for testing
    const config = (provider as any).providerSpecificConfig;
    expect(config).toBe(providerSpecificConfig);
    expect(config.temperature).toBe(0.0);
    expect(config.requestTimeoutMillis).toBe(5000);
  });

  it("should work with optional llmFeatures parameter", () => {
    const llmFeatures = ["fixed_temperature", "max_completion_tokens"] as const;

    expect(() => {
      new TestProvider(
        modelsKeys,
        modelsMetadata,
        errorPatterns,
        providerSpecificConfig,
        modelFamily,
        mockErrorLogger,
        llmFeatures,
      );
    }).not.toThrow();
  });

  it("should correctly store optional features", () => {
    const llmFeatures = ["fixed_temperature"] as const;

    const provider = new TestProvider(
      modelsKeys,
      modelsMetadata,
      errorPatterns,
      providerSpecificConfig,
      modelFamily,
      mockErrorLogger,
      llmFeatures,
    );

    expect(provider.llmFeatures).toEqual(llmFeatures);
  });

  it("should work without optional llmFeatures parameter", () => {
    const provider = new TestProvider(
      modelsKeys,
      modelsMetadata,
      errorPatterns,
      providerSpecificConfig,
      modelFamily,
      mockErrorLogger,
    );

    expect(provider.llmFeatures).toBeUndefined();
  });
});
