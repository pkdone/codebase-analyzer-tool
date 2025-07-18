import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMModelKeysSet,
} from "../../../../../src/llm/llm.types";
import { extractTokensAmountAndLimitFromErrorMsg } from "../../../../../src/llm/processing/msgProcessing/response-error-pattern-parser";
import {
  bedrockLlamaProviderManifest,
  AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT,
  AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT,
  AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT,
} from "../../../../../src/llm/providers/bedrock/bedrockLlama/bedrock-llama.manifest";
import { loadBaseEnvVarsOnly } from "../../../../../src/lifecycle/env";

// Load environment variables (including MongoDB URL) from .env file
const baseEnv = loadBaseEnvVarsOnly();

// Mock environment specific to Bedrock Llama
const mockBedrockLlamaEnv = {
  MONGODB_URL: baseEnv.MONGODB_URL,
  CODEBASE_DIR_PATH: "/test/path",
  IGNORE_ALREADY_PROCESSED_FILES: false,
  LLM: "BedrockLlama",
  BEDROCK_TITAN_EMBEDDINGS_MODEL: "amazon.titan-embed-text-v1",
  BEDROCK_LLAMA_COMPLETIONS_MODEL_PRIMARY: "meta.llama3-3-70b-instruct-v1:0",
  BEDROCK_LLAMA_COMPLETIONS_MODEL_SECONDARY: "meta.llama3-2-90b-instruct-v1:0",
};

// Helper function to resolve URN from environment variable key
const resolveUrn = (urnEnvKey: string): string => {
  return mockBedrockLlamaEnv[urnEnvKey as keyof typeof mockBedrockLlamaEnv] as string;
};

// Create test instance using Bedrock Llama provider manifest
const bedrockLlamaModelKeysSet: LLMModelKeysSet = {
  embeddingsModelKey: bedrockLlamaProviderManifest.models.embeddings.modelKey,
  primaryCompletionModelKey: bedrockLlamaProviderManifest.models.primaryCompletion.modelKey,
  secondaryCompletionModelKey: bedrockLlamaProviderManifest.models.secondaryCompletion?.modelKey,
};

const bedrockLlamaModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [bedrockLlamaProviderManifest.models.embeddings.modelKey]: {
    modelKey: bedrockLlamaProviderManifest.models.embeddings.modelKey,
    urn: resolveUrn(bedrockLlamaProviderManifest.models.embeddings.urnEnvKey),
    purpose: LLMPurpose.EMBEDDINGS,
    dimensions: bedrockLlamaProviderManifest.models.embeddings.dimensions,
    maxTotalTokens: bedrockLlamaProviderManifest.models.embeddings.maxTotalTokens,
  },
  [bedrockLlamaProviderManifest.models.primaryCompletion.modelKey]: {
    modelKey: bedrockLlamaProviderManifest.models.primaryCompletion.modelKey,
    urn: resolveUrn(bedrockLlamaProviderManifest.models.primaryCompletion.urnEnvKey),
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: bedrockLlamaProviderManifest.models.primaryCompletion.maxCompletionTokens,
    maxTotalTokens: bedrockLlamaProviderManifest.models.primaryCompletion.maxTotalTokens,
  },
  // Add common test models that are used in the tests
  [AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT]: {
    modelKey: AWS_COMPLETIONS_LLAMA_V33_70B_INSTRUCT,
    urn: "us.meta.llama3-3-70b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 8192,
    maxTotalTokens: 128000,
  },
  [AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT]: {
    modelKey: AWS_COMPLETIONS_LLAMA_V31_405B_INSTRUCT,
    urn: "meta.llama3-1-405b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 128000,
  },
  [AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT]: {
    modelKey: AWS_COMPLETIONS_LLAMA_V32_90B_INSTRUCT,
    urn: "meta.llama3-1-405b-instruct-v1:0",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 128000,
  },
};

// Add secondary completion if it exists
if (bedrockLlamaProviderManifest.models.secondaryCompletion) {
  const secondaryModel = bedrockLlamaProviderManifest.models.secondaryCompletion;
  bedrockLlamaModelsMetadata[secondaryModel.modelKey] = {
    modelKey: secondaryModel.modelKey,
    urn: resolveUrn(secondaryModel.urnEnvKey),
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: secondaryModel.maxCompletionTokens ?? 4096,
    maxTotalTokens: secondaryModel.maxTotalTokens,
  };
}

describe("Bedrock Llama Provider Tests", () => {
  describe("Token extraction from error messages", () => {
    test("extracts tokens from error message for 70B model", () => {
      const errorMsg =
        "ValidationException: This model's maximum context length is 8192 tokens. Please reduce the length of the prompt.";
      expect(
        extractTokensAmountAndLimitFromErrorMsg(
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
        extractTokensAmountAndLimitFromErrorMsg(
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
      const llm = bedrockLlamaProviderManifest.factory(
        mockBedrockLlamaEnv,
        bedrockLlamaModelKeysSet,
        bedrockLlamaModelsMetadata,
        bedrockLlamaProviderManifest.errorPatterns,
      );
      expect(llm.getModelFamily()).toBe("BedrockLlama");
    });

    test("counts available models", () => {
      const llm = bedrockLlamaProviderManifest.factory(
        mockBedrockLlamaEnv,
        bedrockLlamaModelKeysSet,
        bedrockLlamaModelsMetadata,
        bedrockLlamaProviderManifest.errorPatterns,
      );
      expect(Object.keys(llm.getModelsNames()).length).toBe(3);
    });
  });
});
