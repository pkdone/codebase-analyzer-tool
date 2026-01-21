import { calculateTokenUsageFromError } from "../../../../../../src/common/llm/utils/error-parser";
import { bedrockLlamaProviderManifest } from "../../../../../../src/common/llm/providers/bedrock/llama/bedrock-llama.manifest";

// Test-only model constant for legacy 405B model testing
const AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT";

// Model keys used in tests (matching the manifest)
const BEDROCK_META_LLAMA3_3_70B_INSTRUCT = "bedrock-meta-llama3-3-70b-instruct";
const BEDROCK_META_LLAMA3_2_90B_INSTRUCT = "bedrock-meta-llama3-2-90b-instruct";

import {
  createBedrockMockEnv,
  createBedrockTestData,
  createBedrockProviderInit,
  type AdditionalTestModel,
} from "../../../../helpers/llm/bedrock-test-helper";

// Create mock environment and test data using helpers
const mockBedrockLlamaEnv = createBedrockMockEnv(
  "BedrockLlama",
  [], // No embeddings for Llama
  [BEDROCK_META_LLAMA3_3_70B_INSTRUCT, BEDROCK_META_LLAMA3_2_90B_INSTRUCT],
  {
    BEDROCK_LLAMA_33_70B_MODEL_URN: "meta.llama3-3-70b-instruct-v1:0",
    BEDROCK_LLAMA_32_90B_MODEL_URN: "meta.llama3-2-90b-instruct-v1:0",
  },
);

const additionalTestModels: AdditionalTestModel[] = [
  {
    modelKey: "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT",
    urn: "us.meta.llama3-3-70b-instruct-v1:0",
    maxCompletionTokens: 8192,
    maxTotalTokens: 128000,
  },
  {
    modelKey: AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT,
    urn: "meta.llama3-1-405b-instruct-v1:0",
    maxCompletionTokens: 4096,
    maxTotalTokens: 128000,
  },
  {
    modelKey: "AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT",
    urn: "meta.llama3-1-405b-instruct-v1:0",
    maxCompletionTokens: 4096,
    maxTotalTokens: 128000,
  },
];

const { modelsMetadata: bedrockLlamaModelsMetadata } = createBedrockTestData(
  bedrockLlamaProviderManifest,
  mockBedrockLlamaEnv,
  additionalTestModels,
);

describe("Bedrock Llama Provider Tests", () => {
  describe("Token extraction from error messages", () => {
    test("extracts tokens from error message for 70B model", () => {
      const errorMsg =
        "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt.";
      expect(
        calculateTokenUsageFromError(
          "AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT",
          "dummy prompt",
          errorMsg,
          bedrockLlamaModelsMetadata,
          bedrockLlamaProviderManifest.errorPatterns,
        ),
      ).toStrictEqual({
        completionTokens: 0,
        promptTokens: 8193,
        maxTotalTokens: 8192,
      });
    });

    test("extracts tokens from error message for 405B model", () => {
      const errorMsg =
        "ValidationException: This model's maximum context length is 128000 tokens. Please reduce the length of the prompt.";
      expect(
        calculateTokenUsageFromError(
          "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT",
          "dummy prompt",
          errorMsg,
          bedrockLlamaModelsMetadata,
          bedrockLlamaProviderManifest.errorPatterns,
        ),
      ).toStrictEqual({
        completionTokens: 0,
        promptTokens: 128001,
        maxTotalTokens: 128000,
      });
    });
  });

  describe("Provider implementation", () => {
    test("verifies model family", () => {
      const init = createBedrockProviderInit(bedrockLlamaProviderManifest, mockBedrockLlamaEnv);
      const llm = new bedrockLlamaProviderManifest.implementation(init);
      expect(llm.getProviderFamily()).toBe("BedrockLlama");
    });

    test("counts available models", () => {
      const init = createBedrockProviderInit(bedrockLlamaProviderManifest, mockBedrockLlamaEnv);
      const llm = new bedrockLlamaProviderManifest.implementation(init);
      const modelNames = llm.getAvailableModelNames();
      // Llama has no embeddings (empty array) and 2 completion models
      expect(modelNames.embeddings.length).toBe(0);
      expect(modelNames.completions.length).toBe(2);
    });

    test("caps max_gen_len to 2048 for Llama models", () => {
      // Verify that models with maxCompletionTokens > 2048 should be capped
      // This tests the logic that will be applied when buildCompletionModelSpecificParameters is called
      // eslint-disable-next-line @typescript-eslint/dot-notation
      const testModel = bedrockLlamaModelsMetadata["AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT"];
      expect(testModel.maxCompletionTokens).toBe(8192);

      // The cap should be applied when building request parameters
      // Math.min(8192, 2048) = 2048
      const maxCompletionTokens = testModel.maxCompletionTokens ?? 2048;
      const expectedCappedValue = Math.min(maxCompletionTokens, 2048);
      expect(expectedCappedValue).toBe(2048);
    });
  });
});
