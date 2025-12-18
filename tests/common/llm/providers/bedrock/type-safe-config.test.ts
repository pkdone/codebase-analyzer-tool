import BedrockLlamaLLM from "../../../../../src/common/llm/providers/bedrock/bedrockLlama/bedrock-llama-llm";
import type {
  ProviderInit,
  LLMProviderSpecificConfig,
} from "../../../../../src/common/llm/providers/llm-provider.types";
import type { BedrockLlamaProviderConfig } from "../../../../../src/common/llm/providers/bedrock/bedrockLlama/bedrock-llama.types";
import { LLMPurpose } from "../../../../../src/common/llm/types/llm.types";
import type { IErrorLogger } from "../../../../../src/common/llm/tracking/llm-error-logger.interface";
import { z } from "zod";

/**
 * Tests for type-safe configuration without features array.
 * Verifies that BedrockLlama uses typed config checks instead of feature flags.
 */
describe("Type-Safe Config Without Features Array", () => {
  const mockErrorLogger: IErrorLogger = {
    recordJsonProcessingError: jest.fn().mockResolvedValue(undefined),
  };

  const createInitWithConfig = (config: LLMProviderSpecificConfig): ProviderInit => ({
    manifest: {
      providerName: "Bedrock Llama",
      modelFamily: "bedrock-llama",
      envSchema: z.object({}),
      models: {
        embeddings: {
          modelKey: "test-embed",
          urnEnvKey: "TEST_EMBED",
          purpose: LLMPurpose.EMBEDDINGS,
          maxTotalTokens: 8192,
        },
        primaryCompletion: {
          modelKey: "llama-complete",
          urnEnvKey: "LLAMA_COMPLETE",
          purpose: LLMPurpose.COMPLETIONS,
          maxCompletionTokens: 8192,
          maxTotalTokens: 128000,
        },
      },
      errorPatterns: [],
      providerSpecificConfig: config,
      implementation: BedrockLlamaLLM,
    },
    providerParams: {},
    resolvedModels: {
      embeddings: "test-embed-urn",
      primaryCompletion: "llama-complete-urn",
    },
    errorLogger: mockErrorLogger,
  });

  it("should use type-safe config check for maxGenLenCap", () => {
    const config: BedrockLlamaProviderConfig = {
      requestTimeoutMillis: 5000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
      maxGenLenCap: 2048,
    };

    const init = createInitWithConfig(config);
    const llama = new BedrockLlamaLLM(init);

    const result = (llama as any).buildCompletionRequestBody("llama-complete", "test prompt");

    // Should have max_gen_len set based on maxGenLenCap
    expect(result.max_gen_len).toBeDefined();
    expect(result.max_gen_len).toBeLessThanOrEqual(2048);
  });

  it("should work without maxGenLenCap when not present", () => {
    const config: LLMProviderSpecificConfig = {
      requestTimeoutMillis: 5000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
    };

    const init = createInitWithConfig(config);
    const llama = new BedrockLlamaLLM(init);

    const result = (llama as any).buildCompletionRequestBody("llama-complete", "test prompt");

    // Should not have max_gen_len when maxGenLenCap is not present
    expect(result.max_gen_len).toBeUndefined();
  });

  it("should cap max_gen_len at maxGenLenCap value", () => {
    const config: BedrockLlamaProviderConfig = {
      requestTimeoutMillis: 5000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
      maxGenLenCap: 1024, // Cap at 1024
    };

    const init = createInitWithConfig(config);
    const llama = new BedrockLlamaLLM(init);

    const result = (llama as any).buildCompletionRequestBody("llama-complete", "test prompt");

    // Should be capped at 1024 even though model supports 8192
    expect(result.max_gen_len).toBe(1024);
  });

  it("should use model maxCompletionTokens when smaller than cap", () => {
    const config: BedrockLlamaProviderConfig = {
      requestTimeoutMillis: 5000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
      maxGenLenCap: 10000, // Cap is larger than model limit
    };

    const init = createInitWithConfig(config);
    const llama = new BedrockLlamaLLM(init);

    const result = (llama as any).buildCompletionRequestBody("llama-complete", "test prompt");

    // Should use model's maxCompletionTokens (8192) since it's smaller
    expect(result.max_gen_len).toBe(8192);
  });

  it("should eliminate dependency on features array", () => {
    const config: BedrockLlamaProviderConfig = {
      requestTimeoutMillis: 5000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
      maxGenLenCap: 2048,
    };

    const init = createInitWithConfig(config);

    // Manifest should not have features array
    expect((init.manifest as any).features).toBeUndefined();

    const llama = new BedrockLlamaLLM(init);

    // Provider should not have llmFeatures field
    expect((llama as any).llmFeatures).toBeUndefined();

    // But maxGenLenCap should still work via type-safe config
    const result = (llama as any).buildCompletionRequestBody("llama-complete", "test prompt");
    expect(result.max_gen_len).toBeDefined();
  });

  it("should handle typed config assertion correctly", () => {
    const config: BedrockLlamaProviderConfig = {
      requestTimeoutMillis: 5000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
      maxGenLenCap: 2048,
    };

    const init = createInitWithConfig(config);
    const llama = new BedrockLlamaLLM(init);

    // Access the protected config field
    const providerConfig = (llama as any).providerSpecificConfig;

    // Should be able to check for maxGenLenCap using 'in' operator
    expect("maxGenLenCap" in providerConfig).toBe(true);

    // Type assertion should work for accessing the property
    const typedConfig = providerConfig as BedrockLlamaProviderConfig;
    expect(typedConfig.maxGenLenCap).toBe(2048);
  });

  it("should maintain all standard config properties", () => {
    const config: BedrockLlamaProviderConfig = {
      requestTimeoutMillis: 5000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
      temperature: 0.0,
      topP: 0.1,
      maxGenLenCap: 2048,
    };

    const init = createInitWithConfig(config);
    const llama = new BedrockLlamaLLM(init);

    const providerConfig = (llama as any).providerSpecificConfig as BedrockLlamaProviderConfig;

    // All properties should be accessible
    expect(providerConfig.requestTimeoutMillis).toBe(5000);
    expect(providerConfig.maxRetryAttempts).toBe(3);
    expect(providerConfig.minRetryDelayMillis).toBe(1000);
    expect(providerConfig.maxRetryDelayMillis).toBe(5000);
    expect(providerConfig.temperature).toBe(0.0);
    expect(providerConfig.topP).toBe(0.1);
    expect(providerConfig.maxGenLenCap).toBe(2048);
  });

  it("should compile with TypeScript strict type checking", () => {
    // This test verifies compile-time type safety
    // The fact that this code compiles without errors demonstrates type safety

    const config: BedrockLlamaProviderConfig = {
      requestTimeoutMillis: 5000,
      maxRetryAttempts: 3,
      minRetryDelayMillis: 1000,
      maxRetryDelayMillis: 5000,
      maxGenLenCap: 2048, // TypeScript ensures this property exists and is a number
    };

    // TypeScript will catch any type mismatches at compile time
    expect(typeof config.maxGenLenCap).toBe("number");
    expect(config.maxGenLenCap).toBe(2048);
  });
});
