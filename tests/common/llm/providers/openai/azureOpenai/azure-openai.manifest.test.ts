import { LLMPurpose } from "../../../../../../src/common/llm/types/llm-request.types";
import { ResolvedLLMModelMetadata } from "../../../../../../src/common/llm/types/llm-model.types";
import { calculateTokenUsageFromError } from "../../../../../../src/common/llm/utils/error-parser";
import {
  azureOpenAIProviderManifest,
  AZURE_DEPLOYMENT_ENV_KEYS,
} from "../../../../../../src/common/llm/providers/openai/azure/azure-openai.manifest";
import { loadBaseEnvVarsOnly } from "../../../../../../src/app/env/env";
import { createMockErrorLoggingConfig } from "../../../../helpers/llm/mock-error-logger";
import type { ProviderInit } from "../../../../../../src/common/llm/providers/llm-provider.types";

// Test-only constants
const GPT_COMPLETIONS_GPT4 = "GPT_COMPLETIONS_GPT4";
const GPT_COMPLETIONS_GPT4_32k = "GPT_COMPLETIONS_GPT4_32k";

// Load environment variables (including MongoDB URL) from .env file
const baseEnv = loadBaseEnvVarsOnly();

// Mock environment specific to Azure OpenAI
// Model keys are globally unique, so no provider prefix is needed
const mockAzureOpenAIEnv: Record<string, string> = {
  MONGODB_URL: baseEnv.MONGODB_URL,
  CODEBASE_DIR_PATH: "/test/path",
  SKIP_ALREADY_PROCESSED_FILES: "false",
  LLM_COMPLETION_MODEL_CHAIN: "azure-gpt-4o,azure-gpt-4-turbo",
  LLM_EMBEDDING_MODEL_CHAIN: "azure-text-embedding-ada-002",
  AZURE_OPENAI_LLM_API_KEY: "test-key",
  AZURE_OPENAI_ENDPOINT: "https://test.openai.azure.com/",
  AZURE_OPENAI_EMBEDDINGS_MODEL_DEPLOYMENT: "test-embeddings",
  AZURE_OPENAI_GPT4O_MODEL_DEPLOYMENT: "test-gpt4o-deployment",
  AZURE_OPENAI_GPT4_TURBO_MODEL_DEPLOYMENT: "test-gpt4-turbo-deployment",
  AZURE_OPENAI_ADA_EMBEDDINGS_MODEL_URN: "text-embedding-ada-002",
  AZURE_OPENAI_GPT4O_MODEL_URN: "gpt-4o",
  AZURE_OPENAI_GPT4_TURBO_MODEL_URN: "gpt-4-turbo",
};

// Helper function to resolve URN from environment variable key
const resolveUrn = (urnEnvKey: string): string => {
  return mockAzureOpenAIEnv[urnEnvKey] ?? "unknown-urn";
};

// Get models from manifest
const embeddingsModel = azureOpenAIProviderManifest.models.embeddings[0];
const completionsModels = azureOpenAIProviderManifest.models.completions;

// Create test instance using Azure OpenAI provider manifest
const azureOpenAIModelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
  [embeddingsModel.modelKey]: {
    modelKey: embeddingsModel.modelKey,
    urnEnvKey: embeddingsModel.urnEnvKey,
    urn: resolveUrn(embeddingsModel.urnEnvKey),
    purpose: LLMPurpose.EMBEDDINGS,
    dimensions: embeddingsModel.dimensions,
    maxTotalTokens: embeddingsModel.maxTotalTokens,
  },
  // Add common test models that are used in the tests
  [GPT_COMPLETIONS_GPT4]: {
    modelKey: GPT_COMPLETIONS_GPT4,
    urnEnvKey: "GPT4_URN",
    urn: "gpt-4",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 8192,
  },
  [GPT_COMPLETIONS_GPT4_32k]: {
    modelKey: GPT_COMPLETIONS_GPT4_32k,
    urnEnvKey: "GPT4_32K_URN",
    urn: "gpt-4-32k",
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: 4096,
    maxTotalTokens: 32768,
  },
};

// Add completion models from manifest
for (const completionModel of completionsModels) {
  azureOpenAIModelsMetadata[completionModel.modelKey] = {
    modelKey: completionModel.modelKey,
    urnEnvKey: completionModel.urnEnvKey,
    urn: resolveUrn(completionModel.urnEnvKey),
    purpose: LLMPurpose.COMPLETIONS,
    maxCompletionTokens: completionModel.maxCompletionTokens ?? 4096,
    maxTotalTokens: completionModel.maxTotalTokens,
  };
}

// Helper function to create ProviderInit for tests
function createTestProviderInit(): ProviderInit {
  return {
    manifest: azureOpenAIProviderManifest,
    providerParams: mockAzureOpenAIEnv,
    resolvedModelChain: {
      embeddings: [
        {
          providerFamily: "AzureOpenAI",
          modelKey: embeddingsModel.modelKey,
          modelUrn: resolveUrn(embeddingsModel.urnEnvKey),
        },
      ],
      completions: completionsModels.map((model) => ({
        providerFamily: "AzureOpenAI",
        modelKey: model.modelKey,
        modelUrn: resolveUrn(model.urnEnvKey),
      })),
    },
    errorLogging: createMockErrorLoggingConfig(),
    extractedConfig: azureOpenAIProviderManifest.extractConfig(mockAzureOpenAIEnv),
  };
}

describe("Azure OpenAI Provider Tests", () => {
  describe("Deployment environment key configuration", () => {
    test("manifest contains deploymentEnvKeys in providerSpecificConfig", () => {
      const config = azureOpenAIProviderManifest.providerSpecificConfig;
      expect(config.deploymentEnvKeys).toBeDefined();
      expect(typeof config.deploymentEnvKeys).toBe("object");
    });

    test("AZURE_DEPLOYMENT_ENV_KEYS maps all manifest models to deployment env keys", () => {
      // Collect all model keys from the manifest
      const allModelKeys = [
        ...azureOpenAIProviderManifest.models.embeddings.map((m) => m.modelKey),
        ...azureOpenAIProviderManifest.models.completions.map((m) => m.modelKey),
      ];

      // Verify each model key has a corresponding deployment env key
      allModelKeys.forEach((modelKey) => {
        expect(AZURE_DEPLOYMENT_ENV_KEYS[modelKey]).toBeDefined();
        expect(typeof AZURE_DEPLOYMENT_ENV_KEYS[modelKey]).toBe("string");
        expect(AZURE_DEPLOYMENT_ENV_KEYS[modelKey].length).toBeGreaterThan(0);
      });
    });

    test("deployment env keys follow consistent naming convention", () => {
      Object.values(AZURE_DEPLOYMENT_ENV_KEYS).forEach((envKey) => {
        // Azure deployment env keys should start with AZURE_OPENAI_ and end with _DEPLOYMENT
        expect(envKey).toMatch(/^AZURE_OPENAI_.*_DEPLOYMENT$/);
      });
    });

    test("manifest providerSpecificConfig.deploymentEnvKeys matches exported constant", () => {
      const configDeploymentKeys = azureOpenAIProviderManifest.providerSpecificConfig
        .deploymentEnvKeys as Record<string, string>;
      expect(configDeploymentKeys).toEqual(AZURE_DEPLOYMENT_ENV_KEYS);
    });
  });

  describe("Token extraction from error messages", () => {
    test("extracts tokens from error message with completion tokens", () => {
      const errorMsg =
        "This model's maximum context length is 8191 tokens, however you requested 10346 tokens (10346 in your prompt; 5 for the completion). Please reduce your prompt; or completion length.";
      expect(
        calculateTokenUsageFromError(
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
        calculateTokenUsageFromError(
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
      const init = createTestProviderInit();
      const llm = new azureOpenAIProviderManifest.implementation(init);
      const modelNames = llm.getAvailableModelNames();
      expect(modelNames.embeddings.length).toBeGreaterThanOrEqual(1);
      expect(modelNames.completions.length).toBeGreaterThanOrEqual(1);
    });

    test("verifies model family", () => {
      const init = createTestProviderInit();
      const llm = new azureOpenAIProviderManifest.implementation(init);
      expect(llm.getProviderFamily()).toBe("AzureOpenAI");
    });
  });
});
