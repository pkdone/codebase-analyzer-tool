import BedrockLlamaLLM from "../../../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama-llm";
import { bedrockLlamaProviderManifest } from "../../../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama.manifest";
import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMModelKeysSet,
} from "../../../../../src/llm/types/llm.types";
import { createMockJsonProcessor } from "../../../../helpers/llm/json-processor-mock";

/**
 * Unit tests for BedrockLlamaLLM - Type Safety Improvements
 *
 * These tests verify that the provider-specific configuration is accessed
 * in a type-safe manner without unsafe double type assertions.
 */
describe("BedrockLlamaLLM - Type Safety", () => {
  const mockModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT: {
      modelKey: "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT",
      urn: "meta.llama3-3-70b-instruct-v1:0",
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: 8192,
      maxTotalTokens: 128000,
    },
    AWS_EMBEDDINGS_TITAN_V1: {
      modelKey: "AWS_EMBEDDINGS_TITAN_V1",
      urn: "amazon.titan-embed-text-v1",
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: 1536,
      maxTotalTokens: 8192,
    },
  };

  const mockModelKeysSet: LLMModelKeysSet = {
    embeddingsModelKey: "AWS_EMBEDDINGS_TITAN_V1",
    primaryCompletionModelKey: "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT",
  };

  it("should safely access maxGenLenCap from provider config", () => {
    const llm = new BedrockLlamaLLM(
      mockModelKeysSet,
      mockModelsMetadata,
      [],
      {
        providerSpecificConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 10000,
          maxGenLenCap: 2048,
        },
      },
      createMockJsonProcessor(),
    );

    // Access the protected method via type assertion to test it
    const requestBody = (llm as any).buildCompletionRequestBody(
      "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT",
      "test prompt",
    );

    // Verify that max_gen_len is properly capped
    expect(requestBody.max_gen_len).toBe(2048);
    expect(requestBody.prompt).toContain("test prompt");
    expect(requestBody.temperature).toBeDefined();
    expect(requestBody.top_p).toBeDefined();
  });

  it("should use maxCompletionTokens when it is less than maxGenLenCap", () => {
    const modelsMetadataWithLowMax: Record<string, ResolvedLLMModelMetadata> = {
      AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT: {
        modelKey: "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT",
        urn: "meta.llama3-3-70b-instruct-v1:0",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 1024, // Less than maxGenLenCap
        maxTotalTokens: 128000,
      },
      AWS_EMBEDDINGS_TITAN_V1: {
        modelKey: "AWS_EMBEDDINGS_TITAN_V1",
        urn: "amazon.titan-embed-text-v1",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8192,
      },
    };

    const llm = new BedrockLlamaLLM(
      mockModelKeysSet,
      modelsMetadataWithLowMax,
      [],
      {
        providerSpecificConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 10000,
          maxGenLenCap: 2048,
        },
      },
      createMockJsonProcessor(),
    );

    const requestBody = (llm as any).buildCompletionRequestBody(
      "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT",
      "test prompt",
    );

    // Should use maxCompletionTokens since it's less than maxGenLenCap
    expect(requestBody.max_gen_len).toBe(1024);
  });

  it("should verify maxGenLenCap is in provider manifest config", () => {
    // Verify that the manifest contains the maxGenLenCap configuration
    expect(bedrockLlamaProviderManifest.providerSpecificConfig).toHaveProperty("maxGenLenCap");
    expect(typeof bedrockLlamaProviderManifest.providerSpecificConfig.maxGenLenCap).toBe("number");
    expect(bedrockLlamaProviderManifest.providerSpecificConfig.maxGenLenCap).toBe(2048);
  });

  it("should only apply max_gen_len capping for LLAMA models", () => {
    // Create a non-LLAMA model key to verify the cap is not applied
    const nonLlamaMetadata: Record<string, ResolvedLLMModelMetadata> = {
      SOME_OTHER_MODEL: {
        modelKey: "SOME_OTHER_MODEL",
        urn: "some.other.model",
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: 8192,
        maxTotalTokens: 128000,
      },
      AWS_EMBEDDINGS_TITAN_V1: {
        modelKey: "AWS_EMBEDDINGS_TITAN_V1",
        urn: "amazon.titan-embed-text-v1",
        purpose: LLMPurpose.EMBEDDINGS,
        dimensions: 1536,
        maxTotalTokens: 8192,
      },
    };

    const nonLlamaKeysSet: LLMModelKeysSet = {
      embeddingsModelKey: "AWS_EMBEDDINGS_TITAN_V1",
      primaryCompletionModelKey: "SOME_OTHER_MODEL",
    };

    const llm = new BedrockLlamaLLM(
      nonLlamaKeysSet,
      nonLlamaMetadata,
      [],
      {
        providerSpecificConfig: {
          requestTimeoutMillis: 60000,
          maxRetryAttempts: 3,
          minRetryDelayMillis: 1000,
          maxRetryDelayMillis: 10000,
          maxGenLenCap: 2048,
        },
      },
      createMockJsonProcessor(),
    );

    const requestBody = (llm as any).buildCompletionRequestBody("SOME_OTHER_MODEL", "test prompt");

    // max_gen_len should not be set for non-LLAMA models
    expect(requestBody.max_gen_len).toBeUndefined();
  });
});
