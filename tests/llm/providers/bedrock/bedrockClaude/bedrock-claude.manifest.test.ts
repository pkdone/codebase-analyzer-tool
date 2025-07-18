import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMModelKeysSet,
} from "../../../../../src/llm/llm.types";
import { extractTokensAmountAndLimitFromErrorMsg } from "../../../../../src/llm/processing/msgProcessing/response-error-pattern-parser";
import { bedrockClaudeProviderManifest } from "../../../../../src/llm/providers/bedrock/bedrockClaude/bedrock-claude.manifest";
import { loadBaseEnvVarsOnly } from "../../../../../src/lifecycle/env";

// Test-only constants
const AWS_COMPLETIONS_CLAUDE_V35 = "AWS_COMPLETIONS_CLAUDE_V35";

// Load environment variables (including MongoDB URL) from .env file
const baseEnv = loadBaseEnvVarsOnly();

// Mock environment specific to Bedrock Claude
const mockBedrockClaudeEnv = {
  MONGODB_URL: baseEnv.MONGODB_URL,
  CODEBASE_DIR_PATH: "/test/path",
  IGNORE_ALREADY_PROCESSED_FILES: false,
  LLM: "BedrockClaude",
  BEDROCK_TITAN_EMBEDDINGS_MODEL: "amazon.titan-embed-text-v1",
  BEDROCK_CLAUDE_COMPLETIONS_MODEL_PRIMARY: "anthropic.claude-3-5-sonnet-20240620-v1:0",
  BEDROCK_CLAUDE_COMPLETIONS_MODEL_SECONDARY: "anthropic.claude-3-haiku-20240307-v1:0",
};

// Helper function to resolve URN from environment variable key
const resolveUrn = (urnEnvKey: string): string => {
  return mockBedrockClaudeEnv[urnEnvKey as keyof typeof mockBedrockClaudeEnv] as string;
};

// Create test instance using Bedrock Claude provider manifest
const bedrockClaudeModelKeysSet: LLMModelKeysSet = {
  embeddingsModelKey: bedrockClaudeProviderManifest.models.embeddings.modelKey,
  primaryCompletionModelKey: bedrockClaudeProviderManifest.models.primaryCompletion.modelKey,
  secondaryCompletionModelKey: bedrockClaudeProviderManifest.models.secondaryCompletion?.modelKey,
};

const bedrockClaudeModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [bedrockClaudeProviderManifest.models.embeddings.modelKey]: {
    modelKey: bedrockClaudeProviderManifest.models.embeddings.modelKey,
    urn: resolveUrn(bedrockClaudeProviderManifest.models.embeddings.urnEnvKey),
    purpose: LLMPurpose.EMBEDDINGS,
    dimensions: bedrockClaudeProviderManifest.models.embeddings.dimensions,
    maxTotalTokens: bedrockClaudeProviderManifest.models.embeddings.maxTotalTokens,
  },
  [bedrockClaudeProviderManifest.models.primaryCompletion.modelKey]: {
    modelKey: bedrockClaudeProviderManifest.models.primaryCompletion.modelKey,
    urn: resolveUrn(bedrockClaudeProviderManifest.models.primaryCompletion.urnEnvKey),
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: bedrockClaudeProviderManifest.models.primaryCompletion.maxCompletionTokens,
    maxTotalTokens: bedrockClaudeProviderManifest.models.primaryCompletion.maxTotalTokens,
  },
  // Add common test models that are used in the tests
  [AWS_COMPLETIONS_CLAUDE_V35]: {
    modelKey: AWS_COMPLETIONS_CLAUDE_V35,
    urn: "anthropic.claude-3-5-sonnet-20240620-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4088,
    maxTotalTokens: 200000,
  },
};

// Add secondary completion if it exists
if (bedrockClaudeProviderManifest.models.secondaryCompletion) {
  const secondaryModel = bedrockClaudeProviderManifest.models.secondaryCompletion;
  bedrockClaudeModelsMetadata[secondaryModel.modelKey] = {
    modelKey: secondaryModel.modelKey,
    urn: resolveUrn(secondaryModel.urnEnvKey),
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: secondaryModel.maxCompletionTokens ?? 4096,
    maxTotalTokens: secondaryModel.maxTotalTokens,
  };
}

describe("Bedrock Claude Provider Tests", () => {
  describe("Token extraction from error messages", () => {
    test("extracts tokens from error message with max input tokens", () => {
      const errorMsg =
        "ValidationException: 400 Bad Request: Too many input tokens. Max input tokens: 1048576, request input token count: 1049999 ";
      expect(
        extractTokensAmountAndLimitFromErrorMsg(
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
        extractTokensAmountAndLimitFromErrorMsg(
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
        extractTokensAmountAndLimitFromErrorMsg(
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
      const llm = bedrockClaudeProviderManifest.factory(
        mockBedrockClaudeEnv,
        bedrockClaudeModelKeysSet,
        bedrockClaudeModelsMetadata,
        bedrockClaudeProviderManifest.errorPatterns,
      );
      expect(llm.getModelFamily()).toBe("BedrockClaude");
    });

    test("counts available models", () => {
      const llm = bedrockClaudeProviderManifest.factory(
        mockBedrockClaudeEnv,
        bedrockClaudeModelKeysSet,
        bedrockClaudeModelsMetadata,
        bedrockClaudeProviderManifest.errorPatterns,
      );
      expect(Object.keys(llm.getModelsNames()).length).toBe(3);
    });
  });
});
