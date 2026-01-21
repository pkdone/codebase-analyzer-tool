import { LLMPurpose } from "../../../../src/common/llm/types/llm-request.types";
import {
  ResolvedLLMModelMetadata,
  ModelChainEntry,
} from "../../../../src/common/llm/types/llm-model.types";
import {
  LLMProviderManifest,
  ProviderInit,
} from "../../../../src/common/llm/providers/llm-provider.types";
import { loadBaseEnvVarsOnly } from "../../../../src/app/env/env";
import { createMockErrorLoggingConfig } from "./mock-error-logger";

/**
 * Configuration for additional test models that may be used in tests
 * beyond the models defined in the manifest.
 */
export interface AdditionalTestModel {
  modelKey: string;
  urn: string;
  urnEnvKey?: string;
  maxCompletionTokens: number;
  maxTotalTokens: number;
}

/**
 * Result of creating Bedrock test data from a manifest
 */
export interface BedrockTestData {
  mockEnv: Record<string, string | boolean>;
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>;
}

/**
 * Creates a test environment object for Bedrock providers.
 * Includes base environment variables, LLM chain configuration, and URNs.
 *
 * @param providerFamily - The LLM provider family (e.g., "BedrockClaude")
 * @param embeddingsChain - Array of embedding model keys for the LLM_EMBEDDINGS chain
 * @param completionsChain - Array of completion model keys for the LLM_COMPLETIONS chain
 * @param urns - Record of URN environment variable keys to their values
 * @returns Mock environment object
 */
export function createBedrockMockEnv(
  providerFamily: string,
  embeddingsChain: string[],
  completionsChain: string[],
  urns: Record<string, string>,
): Record<string, string | boolean> {
  const baseEnv = loadBaseEnvVarsOnly();

  const mockEnv: Record<string, string | boolean> = {
    MONGODB_URL: baseEnv.MONGODB_URL,
    CODEBASE_DIR_PATH: "/test/path",
    SKIP_ALREADY_PROCESSED_FILES: false,
    LLM_COMPLETIONS: completionsChain.map((key) => `${providerFamily}:${key}`).join(","),
    LLM_EMBEDDINGS: embeddingsChain.map((key) => `${providerFamily}:${key}`).join(","),
    ...urns,
  };

  return mockEnv;
}

/**
 * Creates standardized test data (model metadata) from a Bedrock provider manifest.
 * This helper reduces boilerplate in Bedrock manifest test files.
 *
 * @param manifest - The provider manifest to extract test data from
 * @param mockEnv - Mock environment object with URNs
 * @param additionalModels - Optional array of additional test models to include
 * @returns Object containing modelsMetadata
 */
export function createBedrockTestData(
  manifest: LLMProviderManifest,
  mockEnv: Record<string, string | boolean>,
  additionalModels?: AdditionalTestModel[],
): BedrockTestData {
  // Helper to resolve URN from environment
  const resolveUrn = (urnEnvKey: string): string => {
    const value = mockEnv[urnEnvKey];
    if (typeof value !== "string") {
      throw new Error(`URN for ${urnEnvKey} not found or not a string in mockEnv`);
    }
    return value;
  };

  const modelsMetadata: Record<string, ResolvedLLMModelMetadata> = {};

  // Add embeddings models
  for (const embModel of manifest.models.embeddings) {
    modelsMetadata[embModel.modelKey] = {
      modelKey: embModel.modelKey,
      urn: resolveUrn(embModel.urnEnvKey),
      urnEnvKey: embModel.urnEnvKey,
      purpose: LLMPurpose.EMBEDDINGS,
      dimensions: embModel.dimensions,
      maxTotalTokens: embModel.maxTotalTokens,
    };
  }

  // Add completion models
  for (const compModel of manifest.models.completions) {
    modelsMetadata[compModel.modelKey] = {
      modelKey: compModel.modelKey,
      urn: resolveUrn(compModel.urnEnvKey),
      urnEnvKey: compModel.urnEnvKey,
      purpose: LLMPurpose.COMPLETIONS,
      maxCompletionTokens: compModel.maxCompletionTokens,
      maxTotalTokens: compModel.maxTotalTokens,
    };
  }

  // Add any additional test models
  if (additionalModels) {
    for (const model of additionalModels) {
      modelsMetadata[model.modelKey] = {
        modelKey: model.modelKey,
        urn: model.urn,
        urnEnvKey: model.urnEnvKey ?? `TEST_${model.modelKey.toUpperCase()}_MODEL_URN`,
        purpose: LLMPurpose.COMPLETIONS,
        maxCompletionTokens: model.maxCompletionTokens,
        maxTotalTokens: model.maxTotalTokens,
      };
    }
  }

  return {
    mockEnv,
    modelsMetadata,
  };
}

/**
 * Creates a ProviderInit object for testing Bedrock providers.
 * This is the modern approach for provider instantiation using the refactored ProviderInit pattern.
 *
 * @param manifest - The provider manifest
 * @param mockEnv - Mock environment object with URNs
 * @returns ProviderInit object ready for provider instantiation
 */
export function createBedrockProviderInit(
  manifest: LLMProviderManifest,
  mockEnv: Record<string, string | boolean>,
): ProviderInit {
  // Helper to resolve URN from environment
  const resolveUrn = (urnEnvKey: string): string => {
    const value = mockEnv[urnEnvKey];
    if (typeof value !== "string") {
      throw new Error(`URN for ${urnEnvKey} not found or not a string in mockEnv`);
    }
    return value;
  };

  const resolvedCompletions: ModelChainEntry[] = manifest.models.completions.map((model) => ({
    providerFamily: manifest.modelFamily,
    modelKey: model.modelKey,
    modelUrn: resolveUrn(model.urnEnvKey),
  }));

  const resolvedEmbeddings: ModelChainEntry[] = manifest.models.embeddings.map((model) => ({
    providerFamily: manifest.modelFamily,
    modelKey: model.modelKey,
    modelUrn: resolveUrn(model.urnEnvKey),
  }));

  return {
    manifest,
    providerParams: mockEnv,
    resolvedModelChain: {
      completions: resolvedCompletions,
      embeddings: resolvedEmbeddings,
    },
    errorLogging: createMockErrorLoggingConfig(),
  };
}
