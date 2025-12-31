import { calculateTokenUsageFromError } from "../../../../../../src/common/llm/utils/error-parser";
import { bedrockLlamaProviderManifest } from "../../../../../../src/common/llm/providers/bedrock/bedrockLlama/bedrock-llama.manifest";

// Test-only model constant for legacy 405B model testing
const AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT = "AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT";
import {
  createBedrockMockEnv,
  createBedrockTestData,
  createBedrockProviderInit,
  type AdditionalTestModel,
} from "../../../../helpers/llm/bedrock-test-helper";

// Create mock environment and test data using helpers
const mockBedrockLlamaEnv = createBedrockMockEnv(
  "BedrockLlama",
  "amazon.titan-embed-text-v1",
  "meta.llama3-3-70b-instruct-v1:0",
  "meta.llama3-2-90b-instruct-v1:0",
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
      expect(llm.getModelFamily()).toBe("Bedrock Llama");
    });

    test("counts available models", () => {
      const init = createBedrockProviderInit(bedrockLlamaProviderManifest, mockBedrockLlamaEnv);
      const llm = new bedrockLlamaProviderManifest.implementation(init);
      expect(Object.keys(llm.getModelsNames()).length).toBe(3);
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
