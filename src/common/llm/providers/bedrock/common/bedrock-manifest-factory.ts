import { z } from "zod";
import type {
  LLMProviderManifest,
  LLMProviderSpecificConfig,
  ProviderInit,
} from "../../llm-provider.types";
import type { LLMProvider } from "../../../types/llm-provider.interface";
import type { LLMModelMetadata } from "../../../types/llm-model.types";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "./bedrock-error-patterns";
import { defaultBedrockProviderConfig } from "./bedrock-defaults.config";

/**
 * Model configuration for a Bedrock provider.
 */
export interface BedrockModelsConfig {
  /** Available embedding models (array) */
  embeddings: readonly LLMModelMetadata[];
  /** Available completion models (array) */
  completions: readonly LLMModelMetadata[];
}

/**
 * Default config extractor for Bedrock providers.
 * Bedrock uses AWS credentials from the environment (via AWS SDK's default credential chain),
 * so no specific env var mapping is needed. Returns the raw params for any provider-specific use.
 */
function extractBedrockConfig(providerParams: Record<string, unknown>): Record<string, unknown> {
  return providerParams;
}

/**
 * Factory function to create a Bedrock provider manifest.
 * This eliminates boilerplate code by consolidating the common structure
 * shared across all Bedrock provider manifests.
 *
 * @param providerFamily - Unique identifier for the provider family (e.g., "BedrockClaude")
 * @param models - Model configurations with embeddings[] and completions[] arrays
 * @param envSchemaFields - Additional environment variable fields (authentication only)
 * @param providerSpecificConfig - Provider-specific configuration overrides (merged with defaults)
 * @param implementation - The LLM provider implementation class
 * @returns A complete LLMProviderManifest for the Bedrock provider
 */
export function createBedrockManifest(
  providerFamily: string,
  models: BedrockModelsConfig,
  envSchemaFields: Record<string, z.ZodString> = {},
  providerSpecificConfig: Partial<LLMProviderSpecificConfig> = {},
  implementation: new (init: ProviderInit) => LLMProvider,
): LLMProviderManifest {
  return {
    providerFamily,
    envSchema: z.object({ ...envSchemaFields }),
    models,
    errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
    providerSpecificConfig: {
      ...defaultBedrockProviderConfig,
      ...providerSpecificConfig,
    },
    extractConfig: extractBedrockConfig,
    implementation,
  };
}
