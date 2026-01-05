import BedrockLlamaLLM from "../../../../../../src/common/llm/providers/bedrock/llama/bedrock-llama-llm";
import {
  bedrockLlamaProviderManifest,
  BedrockLlamaProviderConfigSchema,
} from "../../../../../../src/common/llm/providers/bedrock/llama/bedrock-llama.manifest";
import { z } from "zod";
import {
  createBedrockProviderInit,
  createBedrockMockEnv,
} from "../../../../helpers/llm/bedrock-test-helper";

/**
 * Unit tests for BedrockLlamaLLM - Type Safety Improvements
 *
 * These tests verify that the provider-specific configuration (including maxGenLenCap)
 * is accessed in a type-safe manner through the typed config interface.
 */
describe("BedrockLlamaLLM - Type Safety", () => {
  const mockEnv = createBedrockMockEnv(
    "BedrockLlama",
    "amazon.titan-embed-text-v1",
    "meta.llama3-3-70b-instruct-v1:0",
    "meta.llama3-2-90b-instruct-v1:0",
  );

  it("should apply maxGenLenCap from typed config", () => {
    const init = createBedrockProviderInit(bedrockLlamaProviderManifest, mockEnv);
    const llm = new BedrockLlamaLLM(init);

    // Access the protected method via type assertion to test it
    const requestBody = (llm as any).buildCompletionRequestBody(
      bedrockLlamaProviderManifest.models.primaryCompletion.modelKey,
      "test prompt",
    );

    // Verify that max_gen_len is properly capped using the config value
    expect(requestBody.max_gen_len).toBe(2048);
    expect(requestBody.prompt).toContain("test prompt");
    expect(requestBody.temperature).toBeDefined();
    expect(requestBody.top_p).toBeDefined();
  });

  it("should use maxCompletionTokens when it is less than maxGenLenCap", () => {
    // Create a manifest with a lower maxCompletionTokens
    const modifiedManifest = {
      ...bedrockLlamaProviderManifest,
      models: {
        ...bedrockLlamaProviderManifest.models,
        primaryCompletion: {
          ...bedrockLlamaProviderManifest.models.primaryCompletion,
          maxCompletionTokens: 1024, // Lower than maxGenLenCap (2048)
        },
      },
    };

    const init = createBedrockProviderInit(modifiedManifest, mockEnv);
    const llm = new BedrockLlamaLLM(init);

    const requestBody = (llm as any).buildCompletionRequestBody(
      bedrockLlamaProviderManifest.models.primaryCompletion.modelKey,
      "test prompt",
    );

    // Should use maxCompletionTokens since it's less than maxGenLenCap
    expect(requestBody.max_gen_len).toBe(1024);
  });

  it("should verify maxGenLenCap is in provider manifest config", () => {
    // Verify that the manifest contains the maxGenLenCap configuration
    expect(bedrockLlamaProviderManifest.providerSpecificConfig).toHaveProperty("maxGenLenCap");
    expect(typeof (bedrockLlamaProviderManifest.providerSpecificConfig as any).maxGenLenCap).toBe(
      "number",
    );
    expect((bedrockLlamaProviderManifest.providerSpecificConfig as any).maxGenLenCap).toBe(2048);
  });

  describe("Zod schema validation", () => {
    it("should validate correct provider-specific config", () => {
      const validConfig = {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 10000,
        maxGenLenCap: 2048,
      };

      expect(() => BedrockLlamaProviderConfigSchema.parse(validConfig)).not.toThrow();
      const parsed = BedrockLlamaProviderConfigSchema.parse(validConfig);
      expect(parsed.maxGenLenCap).toBe(2048);
    });

    it("should reject config missing maxGenLenCap", () => {
      const invalidConfig = {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 10000,
        // Missing maxGenLenCap
      };

      expect(() => BedrockLlamaProviderConfigSchema.parse(invalidConfig)).toThrow(z.ZodError);
    });

    it("should reject config with invalid maxGenLenCap type", () => {
      const invalidConfig = {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 10000,
        maxGenLenCap: "not-a-number", // Invalid type
      };

      expect(() => BedrockLlamaProviderConfigSchema.parse(invalidConfig)).toThrow(z.ZodError);
    });

    it("should reject config with non-positive maxGenLenCap", () => {
      const invalidConfig = {
        requestTimeoutMillis: 60000,
        maxRetryAttempts: 3,
        minRetryDelayMillis: 1000,
        maxRetryDelayMillis: 10000,
        maxGenLenCap: -1, // Invalid: must be positive
      };

      expect(() => BedrockLlamaProviderConfigSchema.parse(invalidConfig)).toThrow(z.ZodError);
    });

    it("should validate manifest providerSpecificConfig matches schema", () => {
      // Verify the manifest's providerSpecificConfig is valid according to the schema
      expect(() =>
        BedrockLlamaProviderConfigSchema.parse(bedrockLlamaProviderManifest.providerSpecificConfig),
      ).not.toThrow();
    });
  });
});
