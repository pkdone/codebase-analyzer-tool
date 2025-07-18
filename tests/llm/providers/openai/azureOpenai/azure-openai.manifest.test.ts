import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMModelKeysSet,
} from "../../../../../src/llm/llm.types";
import { extractTokensAmountAndLimitFromErrorMsg } from "../../../../../src/llm/processing/msgProcessing/response-error-pattern-parser";
import { azureOpenAIProviderManifest } from "../../../../../src/llm/providers/openai/azureOpenai/azure-openai.manifest";
import { loadBaseEnvVarsOnly } from "../../../../../src/lifecycle/env";

// Test-only constants
const GPT_COMPLETIONS_GPT4 = "GPT_COMPLETIONS_GPT4";
const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";

// Load environment variables (including MongoDB URL) from .env file
const baseEnv = loadBaseEnvVarsOnly();

// Mock environment specific to Azure OpenAI
const mockAzureOpenAIEnv = {
  MONGODB_URL: baseEnv.MONGODB_URL,
  CODEBASE_DIR_PATH: "/test/path",
  IGNORE_ALREADY_PROCESSED_FILES: false,
  LLM: "AzureOpenAI",
  AZURE_OPENAI_LLM_API_KEY: "test-key",
  AZURE_OPENAI_ENDPOINT: "https://test.openai.azure.com/",
  AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT: "test-embeddings",
  AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_PRIMARY: "test-primary",
  AZURE_OPENAI_COMPLETIONS_MODEL_DEPLOYMENT_SECONDARY: "test-secondary",
  AZURE_OPENAI_ADA_EMBEDDINGS_MODEL: "text-embedding-ada-002",
  AZURE_OPENAI_GPT_COMPLETIONS_MODEL_PRIMARY: "gpt-4o",
  AZURE_OPENAI_GPT_COMPLETIONS_MODEL_SECONDARY: "gpt-4-turbo",
};

// Helper function to resolve URN from environment variable key
const resolveUrn = (urnEnvKey: string): string => {
  return mockAzureOpenAIEnv[urnEnvKey as keyof typeof mockAzureOpenAIEnv] as string;
};

// Create test instance using Azure OpenAI provider manifest
const azureOpenAIModelKeysSet: LLMModelKeysSet = {
  embeddingsModelKey: azureOpenAIProviderManifest.models.embeddings.modelKey,
  primaryCompletionModelKey: azureOpenAIProviderManifest.models.primaryCompletion.modelKey,
  secondaryCompletionModelKey: azureOpenAIProviderManifest.models.secondaryCompletion?.modelKey,
};

const azureOpenAIModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [azureOpenAIProviderManifest.models.embeddings.modelKey]: {
    modelKey: azureOpenAIProviderManifest.models.embeddings.modelKey,
    urn: resolveUrn(azureOpenAIProviderManifest.models.embeddings.urnEnvKey),
    purpose: LLMPurpose.EMBEDDINGS,
    dimensions: azureOpenAIProviderManifest.models.embeddings.dimensions,
    maxTotalTokens: azureOpenAIProviderManifest.models.embeddings.maxTotalTokens,
  },
  [azureOpenAIProviderManifest.models.primaryCompletion.modelKey]: {
    modelKey: azureOpenAIProviderManifest.models.primaryCompletion.modelKey,
    urn: resolveUrn(azureOpenAIProviderManifest.models.primaryCompletion.urnEnvKey),
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: azureOpenAIProviderManifest.models.primaryCompletion.maxCompletionTokens,
    maxTotalTokens: azureOpenAIProviderManifest.models.primaryCompletion.maxTotalTokens,
  },
  // Add common test models that are used in the tests
  [GPT_COMPLETIONS_GPT4]: {
    modelKey: GPT_COMPLETIONS_GPT4,
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  },
  [GPT_COMPLETIONS_GPT4_32k]: {
    modelKey: GPT_COMPLETIONS_GPT4_32k,
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
};

// Add secondary completion if it exists
if (azureOpenAIProviderManifest.models.secondaryCompletion) {
  const secondaryModel = azureOpenAIProviderManifest.models.secondaryCompletion;
  azureOpenAIModelsMetadata[secondaryModel.modelKey] = {
    modelKey: secondaryModel.modelKey,
    urn: resolveUrn(secondaryModel.urnEnvKey),
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: secondaryModel.maxCompletionTokens ?? 4096,
    maxTotalTokens: secondaryModel.maxTotalTokens,
  };
}

describe("Azure OpenAI Provider Tests", () => {
  describe("Token extraction from error messages", () => {
    test("extracts tokens from error message with completion tokens", () => {
      const errorMsg =
        "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.";
      expect(
        extractTokensAmountAndLimitFromErrorMsg(
          "GPT_COMPLETIONS_GPT4",
          "dummy prompt",
          errorMsg,
          azureOpenAIModelsMetadata,
          azureOpenAIProviderManifest.errorPatterns,
        ),
      ).toStrictEqual({
        completionTokens: 5,
        promptTokens: 10346,
        maxTotalTokens: 8191,
      });
    });

    test("extracts tokens from error message without completion tokens", () => {
      const errorMsg =
        "This model's maximum context length is 8192 tokens. However, your messages resulted in 8545 tokens. Please reduce the length of the messages.";
      expect(
        extractTokensAmountAndLimitFromErrorMsg(
          "GPT_COMPLETIONS_GPT4",
          "dummy prompt",
          errorMsg,
          azureOpenAIModelsMetadata,
          azureOpenAIProviderManifest.errorPatterns,
        ),
      ).toStrictEqual({
        completionTokens: 0,
        promptTokens: 8545,
        maxTotalTokens: 8192,
      });
    });
  });

  describe("Provider implementation", () => {
    test("counts available models", () => {
      const llm = azureOpenAIProviderManifest.factory(
        mockAzureOpenAIEnv,
        azureOpenAIModelKeysSet,
        azureOpenAIModelsMetadata,
        azureOpenAIProviderManifest.errorPatterns,
      );
      expect(Object.keys(llm.getModelsNames()).length).toBe(3);
    });

    test("verifies model family", () => {
      const llm = azureOpenAIProviderManifest.factory(
        mockAzureOpenAIEnv,
        azureOpenAIModelKeysSet,
        azureOpenAIModelsMetadata,
        azureOpenAIProviderManifest.errorPatterns,
      );
      expect(llm.getModelFamily()).toBe("AzureOpenAI");
    });
  });
});
