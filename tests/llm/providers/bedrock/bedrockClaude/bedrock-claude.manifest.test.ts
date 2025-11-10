import { calculateTokenUsageFromError } from "../../../../../src/llm/utils/error-parser";
import { bedrockClaudeProviderManifest } from "../../../../../src/llm/providers/bedrock/bedrockClaude/bedrock-claude.manifest";
import { createMockJsonProcessor } from "../../../../helpers/llm/json-processor-mock";
import {
  createBedrockMockEnv,
  createBedrockTestData,
  type AdditionalTestModel,
} from "../../../../helpers/llm/bedrock-test-helper";

// Test-only constants
const AWS_COMPLETIONS_CLAUDE_V35 = "AWS_COMPLETIONS_CLAUDE_V35";

// Create mock environment and test data using helpers
const mockBedrockClaudeEnv = createBedrockMockEnv(
  "BedrockClaude",
  "amazon.titan-embed-text-v1",
  "anthropic.claude-3-5-sonnet-20240620-v1:0",
  "anthropic.claude-3-haiku-20240307-v1:0",
);

const additionalTestModels: AdditionalTestModel[] = [
  {
    modelKey: AWS_COMPLETIONS_CLAUDE_V35,
    urn: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    maxCompletionTokens: 4088,
    maxTotalTokens: 200000,
  },
];

const { modelKeysSet: bedrockClaudeModelKeysSet, modelsMetadata: bedrockClaudeModelsMetadata } =
  createBedrockTestData(bedrockClaudeProviderManifest, mockBedrockClaudeEnv, additionalTestModels);

describe("Bedrock Claude Provider Tests", () => {
  describe("Token extraction from error messages", () => {
    test("extracts tokens from error message with max input tokens", () => {
      const errorMsg =
        "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 1048576, request input token count: 1049999 ";
      expect(
        calculateTokenUsageFromError(
          AWS_COMPLETIONS_CLAUDE_V35,
          "dummy prompt",
          errorMsg,
          bedrockClaudeModelsMetadata,
          bedrockClaudeProviderManifest.errorPatterns,
        ),
      ).toStrictEqual({
        completionTokens: 0,
        promptTokens: 1049999,
        maxTotalTokens: 1048576,
      });
    });

    test("extracts tokens from error message with maxLength", () => {
      const errorMsg =
        "ValidationException: Malformed input request: expected maxLength: 2097152, actual: 2300000, please reformat your input and try again.";
      expect(
        calculateTokenUsageFromError(
          AWS_COMPLETIONS_CLAUDE_V35,
          "dummy prompt",
          errorMsg,
          bedrockClaudeModelsMetadata,
          bedrockClaudeProviderManifest.errorPatterns,
        ),
      ).toStrictEqual({
        completionTokens: 0,
        promptTokens: 219346,
        maxTotalTokens: 200000,
      });
    });

    test("extracts tokens from generic too long error", () => {
      const errorMsg = "Input is too long for requested model.";
      expect(
        calculateTokenUsageFromError(
          AWS_COMPLETIONS_CLAUDE_V35,
          "dummy prompt",
          errorMsg,
          bedrockClaudeModelsMetadata,
          bedrockClaudeProviderManifest.errorPatterns,
        ),
      ).toStrictEqual({
        completionTokens: 0,
        promptTokens: 200001,
        maxTotalTokens: 200000,
      });
    });
  });

  describe("Provider implementation", () => {
    test("verifies model family", () => {
      const llm = new bedrockClaudeProviderManifest.implementation(
        mockBedrockClaudeEnv as any,
        bedrockClaudeModelKeysSet,
        bedrockClaudeModelsMetadata,
        bedrockClaudeProviderManifest.errorPatterns,
        { providerSpecificConfig: bedrockClaudeProviderManifest.providerSpecificConfig },
        createMockJsonProcessor(),
        bedrockClaudeProviderManifest.modelFamily,
      );
      expect(llm.getModelFamily()).toBe("BedrockClaude");
    });

    test("counts available models", () => {
      const llm = new bedrockClaudeProviderManifest.implementation(
        mockBedrockClaudeEnv as any,
        bedrockClaudeModelKeysSet,
        bedrockClaudeModelsMetadata,
        bedrockClaudeProviderManifest.errorPatterns,
        { providerSpecificConfig: bedrockClaudeProviderManifest.providerSpecificConfig },
        createMockJsonProcessor(),
        bedrockClaudeProviderManifest.modelFamily,
      );
      expect(Object.keys(llm.getModelsNames()).length).toBe(3);
    });
  });
});
