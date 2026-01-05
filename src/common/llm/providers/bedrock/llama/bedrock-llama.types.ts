import { z } from "zod";
import type { LLMProviderSpecificConfig } from "../../llm-provider.types";

/**
 * Zod schema for Bedrock Llama provider-specific configuration.
 * Validates that the providerSpecificConfig contains all required fields,
 * including the maxGenLenCap property needed for the CAP_MAX_GEN_LEN feature.
 */
export const BedrockLlamaProviderConfigSchema = z.object({
  requestTimeoutMillis: z.number().int().positive(),
  maxRetryAttempts: z.number().int().nonnegative(),
  minRetryDelayMillis: z.number().int().nonnegative(),
  maxRetryDelayMillis: z.number().int().nonnegative(),
  maxGenLenCap: z.number().int().positive(),
});

/**
 * Type-safe configuration interface for Bedrock Llama provider.
 * Extends base config with Llama-specific maxGenLenCap property.
 */
export interface BedrockLlamaProviderConfig extends LLMProviderSpecificConfig {
  maxGenLenCap: number;
}

/**
 * Type guard to check if a config is a valid BedrockLlamaProviderConfig.
 * Uses Zod schema validation for robust type checking.
 */
export function isBedrockLlamaProviderConfig(
  config: LLMProviderSpecificConfig,
): config is BedrockLlamaProviderConfig {
  return BedrockLlamaProviderConfigSchema.safeParse(config).success;
}
