import { bedrockLlamaProviderManifest } from "../../../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama.manifest";
import BedrockLlamaLLM from "../../../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama-llm";
import { JsonProcessor } from "../../../../../src/llm/json-processing/core/json-processor";
// Local minimal builder to avoid cross-test helper dependency (helper not present in repo)
const buildJsonProcessorForTests = () => new JsonProcessor(false);

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
  let jsonProcessor: JsonProcessor;
  beforeAll(() => {
    jsonProcessor = buildJsonProcessorForTests();
  });

  test("CAP_MAX_GEN_LEN feature triggers max_gen_len capping", () => {
    const instance = new BedrockLlamaLLM(
      mockModelsKeysSet,
      mockModelsMetadata,
      bedrockLlamaProviderManifest.errorPatterns,
      { providerSpecificConfig: bedrockLlamaProviderManifest.providerSpecificConfig },
      jsonProcessor,
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
      mockModelsKeysSet,
      mockModelsMetadata,
      bedrockLlamaProviderManifest.errorPatterns,
      { providerSpecificConfig: bedrockLlamaProviderManifest.providerSpecificConfig },
      jsonProcessor,
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
