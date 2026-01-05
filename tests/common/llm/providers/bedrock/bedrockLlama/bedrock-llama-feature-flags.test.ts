import { bedrockLlamaProviderManifest } from "../../../../../../src/common/llm/providers/bedrock/llama/bedrock-llama.manifest";
import { createMockErrorLogger } from "../../../../helpers/llm/mock-error-logger";
import BedrockLlamaLLM from "../../../../../../src/common/llm/providers/bedrock/llama/bedrock-llama-llm";
import type { ProviderInit } from "../../../../../../src/common/llm/providers/llm-provider.types";

/**
 * Tests for Bedrock Llama type-safe configuration (replacing feature flags).
 */
describe("Bedrock Llama Type-Safe Configuration", () => {
  const createInit = (): ProviderInit => ({
    manifest: bedrockLlamaProviderManifest,
    providerParams: {},
    resolvedModels: {
      embeddings: "llama-embed-urn",
      primaryCompletion: "llama-primary-urn",
      secondaryCompletion: "llama-secondary-urn",
    },
    errorLogger: createMockErrorLogger(),
  });

  test("maxGenLenCap property in config triggers max_gen_len capping", () => {
    const init = createInit();
    const instance = new BedrockLlamaLLM(init);

    const body = (instance as any).buildCompletionRequestBody(
      bedrockLlamaProviderManifest.models.primaryCompletion.modelKey,
      "Test prompt",
    );

    expect(body.max_gen_len).toBeDefined();
    const maxGenLenCap = (bedrockLlamaProviderManifest.providerSpecificConfig as any).maxGenLenCap;
    expect(body.max_gen_len).toBeLessThanOrEqual(maxGenLenCap);
  });

  test("manifest no longer has features array", () => {
    expect((bedrockLlamaProviderManifest as any).features).toBeUndefined();
  });

  test("provider instance no longer has llmFeatures field", () => {
    const init = createInit();
    const instance = new BedrockLlamaLLM(init);

    // llmFeatures field should not exist
    expect((instance as any).llmFeatures).toBeUndefined();
  });

  test("type-safe config check works with 'in' operator", () => {
    const init = createInit();
    const instance = new BedrockLlamaLLM(init);

    const config = (instance as any).providerSpecificConfig;
    expect("maxGenLenCap" in config).toBe(true);
    expect(config.maxGenLenCap).toBeDefined();
  });
});
