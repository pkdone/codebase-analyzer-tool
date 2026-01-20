import { z } from "zod";
import type {
  LLMProviderManifest,
  LLMProviderSpecificConfig,
  ProviderInit,
} from "../../llm-provider.types";
import type { LLMProvider } from "../../../types/llm-provider.interface";
import { BEDROCK_COMMON_ERROR_PATTERNS } from "./bedrock-error-patterns";
import { createBedrockEnvSchema } from "./bedrock-models.constants";
import { defaultBedrockProviderConfig } from "./bedrock-defaults.config";

/**
 * Factory function to create a Bedrock provider manifest.
 * This eliminates boilerplate code by consolidating the common structure
 * shared across all Bedrock provider manifests.
 *
 * @param providerName - User-friendly name for the provider (e.g., "Bedrock Claude")
 * @param modelFamily - Unique identifier for the provider/family (e.g., "BedrockClaude")
 * @param models - Model configurations (embeddings, primaryCompletion, optional secondaryCompletion)
 * @param envSchemaFields - Additional environment variable fields to add to the base Bedrock schema
 * @param providerSpecificConfig - Provider-specific configuration overrides (merged with defaults)
 * @param implementation - The LLM provider implementation class
 * @returns A complete LLMProviderManifest for the Bedrock provider
 */
export function createBedrockManifest(
  providerName: string,
  modelFamily: string,
  models: LLMProviderManifest["models"],
  envSchemaFields: Record<string, z.ZodString>,
  providerSpecificConfig: Partial<LLMProviderSpecificConfig> = {},
  implementation: new (init: ProviderInit) => LLMProvider,
): LLMProviderManifest {
  return {
    providerName,
    modelFamily,
    envSchema: createBedrockEnvSchema(envSchemaFields),
    models,
    errorPatterns: BEDROCK_COMMON_ERROR_PATTERNS,
    providerSpecificConfig: {
      ...defaultBedrockProviderConfig,
      ...providerSpecificConfig,
    },
    implementation,
  };
}
