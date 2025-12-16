import { bedrockLlamaProviderManifest } from "../../../../../../src/common/llm/providers/bedrock/bedrockLlama/bedrock-llama.manifest";
import { createMockErrorLogger } from "../../../test-helpers/mock-error-logger";
import BedrockLlamaLLM from "../../../../../../src/common/llm/providers/bedrock/bedrockLlama/bedrock-llama-llm";
// Minimal mocks for metadata
const mockModelsKeysSet = {
  embeddingsModelKey: bedrockLlamaProviderManifest.models.embeddings.modelKey,
  primaryCompletionModelKey: bedrockLlamaProviderManifest.models.primaryCompletion.modelKey,
};

const mockModelsMetadata: Record<string, any> = {
  [bedrockLlamaProviderManifest.models.primaryCompletion.modelKey]: {
    ...bedrockLlamaProviderManifest.models.primaryCompletion,
    urn: "llama-primary-urn",
  },
};

describe("Bedrock Llama Manifest Feature Flags", () => {
  test("CAP_MAX_GEN_LEN feature triggers max_gen_len capping", () => {
    const instance = new BedrockLlamaLLM(
      {} as any,
      mockModelsKeysSet,
      mockModelsMetadata,
      bedrockLlamaProviderManifest.errorPatterns,
      { providerSpecificConfig: bedrockLlamaProviderManifest.providerSpecificConfig },
      bedrockLlamaProviderManifest.modelFamily,
      createMockErrorLogger(),
    ) as unknown as {
      llmFeatures?: readonly string[];
      buildCompletionRequestBody: (modelKey: string, prompt: string) => any;
    };
    // Attach features manually (provider manager normally does this)
    instance.llmFeatures = bedrockLlamaProviderManifest.features;
    const body = instance.buildCompletionRequestBody(
      bedrockLlamaProviderManifest.models.primaryCompletion.modelKey,
      "Test prompt",
    );
    expect(body.max_gen_len).toBeDefined();
    const maxGenLenCap = bedrockLlamaProviderManifest.providerSpecificConfig.maxGenLenCap as number;
    expect(body.max_gen_len).toBeLessThanOrEqual(maxGenLenCap);
  });

  test("Removing CAP_MAX_GEN_LEN feature results in no explicit max_gen_len", () => {
    const instance = new BedrockLlamaLLM(
      {} as any,
      mockModelsKeysSet,
      mockModelsMetadata,
      bedrockLlamaProviderManifest.errorPatterns,
      { providerSpecificConfig: bedrockLlamaProviderManifest.providerSpecificConfig },
      bedrockLlamaProviderManifest.modelFamily,
      createMockErrorLogger(),
    ) as unknown as {
      llmFeatures?: readonly string[];
      buildCompletionRequestBody: (modelKey: string, prompt: string) => any;
    };
    instance.llmFeatures = []; // No features
    const body = instance.buildCompletionRequestBody(
      bedrockLlamaProviderManifest.models.primaryCompletion.modelKey,
      "Test prompt",
    );
    expect(body.max_gen_len).toBeUndefined();
  });
});
