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
 * Factory function to create a Bedrock provider manifest.
 * This eliminates boilerplate code by consolidating the common structure
 * shared across all Bedrock provider manifests.
 *
 * @param providerName - User-friendly name for the provider (e.g., "Bedrock Claude")
 * @param modelFamily - Unique identifier for the provider/family (e.g., "BedrockClaude")
 * @param models - Model configurations with embeddings[] and completions[] arrays
 * @param envSchemaFields - Additional environment variable fields (authentication only)
 * @param providerSpecificConfig - Provider-specific configuration overrides (merged with defaults)
 * @param implementation - The LLM provider implementation class
 * @returns A complete LLMProviderManifest for the Bedrock provider
 */
export function createBedrockManifest(
  providerName: string,
  modelFamily: string,
  models: BedrockModelsConfig,
  envSchemaFields: Record<string, z.ZodString> = {},
  providerSpecificConfig: Partial<LLMProviderSpecificConfig> = {},
  implementation: new (init: ProviderInit) => LLMProvider,
): LLMProviderManifest {
  return {
    providerName,
    modelFamily,
    envSchema: z.object({ ...envSchemaFields }),
    models,
    errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
    providerSpecificConfig: {
      ...defaultBedrockProviderConfig,
      ...providerSpecificConfig,
    },
    implementation,
  };
}
