import { calculateTokenUsageFromError } from "../../../../../../src/common/llm/utils/error-parser";
import { bedrockClaudeProviderManifest } from "../../../../../../src/common/llm/providers/bedrock/claude/bedrock-claude.manifest";
import {
  createBedrockMockEnv,
  createBedrockTestData,
  createBedrockProviderInit,
  type AdditionalTestModel,
} from "../../../../helpers/llm/bedrock-test-helper";

// Test-only constants
const AWS_COMPLETIONS_CLAUDE_V35 = "AWS_COMPLETIONS_CLAUDE_V35";
const BEDROCK_CLAUDE_OPUS_V45 = "bedrock-claude-opus-4.5";
const BEDROCK_CLAUDE_SONNET_V45 = "bedrock-claude-sonnet-4.5";

// Create mock environment and test data using helpers
const mockBedrockClaudeEnv = createBedrockMockEnv(
  "BedrockClaude",
  [], // No embeddings for Claude
  [BEDROCK_CLAUDE_OPUS_V45, BEDROCK_CLAUDE_SONNET_V45],
  {
    BEDROCK_CLAUDE_OPUS_45_MODEL_URN: "global.anthropic.claude-opus-4-5-20251101-v1:0",
    BEDROCK_CLAUDE_SONNET_45_MODEL_URN: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
  },
);

const additionalTestModels: AdditionalTestModel[] = [
  {
    modelKey: AWS_COMPLETIONS_CLAUDE_V35,
    urn: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    maxCompletionTokens: 4088,
    maxTotalTokens: 200000,
  },
];

const { modelsMetadata: bedrockClaudeModelsMetadata } = createBedrockTestData(
  bedrockClaudeProviderManifest,
  mockBedrockClaudeEnv,
  additionalTestModels,
);

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
      const init = createBedrockProviderInit(bedrockClaudeProviderManifest, mockBedrockClaudeEnv);
      const llm = new bedrockClaudeProviderManifest.implementation(init);
      expect(llm.getProviderFamily()).toBe("BedrockClaude");
    });

    test("counts available models", () => {
      const init = createBedrockProviderInit(bedrockClaudeProviderManifest, mockBedrockClaudeEnv);
      const llm = new bedrockClaudeProviderManifest.implementation(init);
      const modelNames = llm.getAvailableModelNames();
      // Claude has no embeddings (empty array) and 2 completion models
      expect(modelNames.embeddings.length).toBe(0);
      expect(modelNames.completions.length).toBe(2);
    });
  });
});
