import {
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMModelKeysSet,
} from "../../../src/common/llm/types/llm.types";
import { LLMProviderManifest } from "../../../src/common/llm/providers/llm-provider.types";
import { loadBaseEnvVarsOnly } from "../../../src/env/env";

/**
 * Configuration for additional test models that may be used in tests
 * beyond the primary and secondary completion models from the manifest.
 */
export interface AdditionalTestModel {
  modelKey: string;
  urn: string;
  maxCompletionTokens: number;
  maxTotalTokens: number;
}

/**
 * Result of creating Bedrock test data from a manifest
 */
export interface BedrockTestData {
  mockEnv: Record<string, string | boolean>;
  modelKeysSet: LLMModelKeysSet;
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>;
}

/**
 * Creates a test environment object for Bedrock providers.
 * Includes base environment variables and provider-specific configuration.
 *
 * @param providerName - The LLM provider name (e.g., "BedrockClaude")
 * @param embeddingsUrn - The URN for the embeddings model
 * @param primaryCompletionUrn - The URN for the primary completion model
 * @param secondaryCompletionUrn - Optional URN for the secondary completion model
 * @returns Mock environment object
 */
export function createBedrockMockEnv(
  providerName: string,
  embeddingsUrn: string,
  primaryCompletionUrn: string,
  secondaryCompletionUrn?: string,
): Record<string, string | boolean> {
  const baseEnv = loadBaseEnvVarsOnly();

  const mockEnv: Record<string, string | boolean> = {
    MONGODB_URL: baseEnv.MONGODB_URL,
    CODEBASE_DIR_PATH: "/test/path",
    SKIP_ALREADY_PROCESSED_FILES: false,
    LLM: providerName,
    BEDROCK_TITAN_EMBEDDINGS_MODEL: embeddingsUrn,
  };

  // Add provider-specific environment variables based on provider name
  const providerPrefix = providerName.replace("Bedrock", "").toUpperCase();
  mockEnv[`BEDROCK_${providerPrefix}_COMPLETIONS_MODEL_PRIMARY`] = primaryCompletionUrn;

  if (secondaryCompletionUrn) {
    mockEnv[`BEDROCK_${providerPrefix}_COMPLETIONS_MODEL_SECONDARY`] = secondaryCompletionUrn;
  }

  return mockEnv;
}

/**
 * Creates standardized test data (model keys and metadata) from a Bedrock provider manifest.
 * This helper reduces boilerplate in Bedrock manifest test files.
 *
 * @param manifest - The provider manifest to extract test data from
 * @param mockEnv - Mock environment object with URNs
 * @param additionalModels - Optional array of additional test models to include
 * @returns Object containing modelKeysSet and modelsMetadata
 */
export function createBedrockTestData(
  manifest: LLMProviderManifest,
  mockEnv: Record<string, string | boolean>,
  additionalModels?: AdditionalTestModel[],
): BedrockTestData {
  // Helper to resolve URN from environment
  const resolveUrn = (urnEnvKey: string): string => {
    const value = mockEnv[urnEnvKey];
    return typeof value === "string" ? value : String(value);
  };

  // Build model keys set
  const modelKeysSet: LLMModelKeysSet = {
    embeddingsModelKey: manifest.models.embeddings.modelKey,
    primaryCompletionModelKey: manifest.models.primaryCompletion.modelKey,
    secondaryCompletionModelKey: manifest.models.secondaryCompletion?.modelKey,
  };

  // Build models metadata starting with embeddings and primary completion
  const modelsMetadata: Record<string, ResolvedLLMModelMetadata> = {
    [manifest.models.embeddings.modelKey]: {
      modelKey: manifest.models.embeddings.modelKey,
      urn: resolveUrn(manifest.models.embeddings.urnEnvKey),
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: manifest.models.embeddings.dimensions,
      maxTotalTokens: manifest.models.embeddings.maxTotalTokens,
    },
    [manifest.models.primaryCompletion.modelKey]: {
      modelKey: manifest.models.primaryCompletion.modelKey,
      urn: resolveUrn(manifest.models.primaryCompletion.urnEnvKey),
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: manifest.models.primaryCompletion.maxCompletionTokens,
      maxTotalTokens: manifest.models.primaryCompletion.maxTotalTokens,
    },
  };

  // Add secondary completion if it exists
  if (manifest.models.secondaryCompletion) {
    const secondaryModel = manifest.models.secondaryCompletion;
    modelsMetadata[secondaryModel.modelKey] = {
      modelKey: secondaryModel.modelKey,
      urn: resolveUrn(secondaryModel.urnEnvKey),
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: secondaryModel.maxCompletionTokens ?? 4096,
      maxTotalTokens: secondaryModel.maxTotalTokens,
    };
  }

  // Add any additional test models
  if (additionalModels) {
    for (const model of additionalModels) {
      modelsMetadata[model.modelKey] = {
        modelKey: model.modelKey,
        urn: model.urn,
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: model.maxCompletionTokens,
        maxTotalTokens: model.maxTotalTokens,
      };
    }
  }

  return {
    mockEnv,
    modelKeysSet,
    modelsMetadata,
  };
}
