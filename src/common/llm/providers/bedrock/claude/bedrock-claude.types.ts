import { z } from "zod";
import type { LLMProviderSpecificConfig } from "../../llm-provider.types";

/**
 * Zod schema for Bedrock Claude provider-specific configuration.
 * Validates that the providerSpecificConfig contains all required fields,
 * including the anthropicBetaFlags property for extended context windows.
 */
export const BedrockClaudeProviderConfigSchema = z.object({
  requestTimeoutMillis: z.number().int().positive(),
  maxRetryAttempts: z.number().int().nonnegative(),
  minRetryDelayMillis: z.number().int().nonnegative(),
  maxRetryDelayMillis: z.number().int().nonnegative(),
  apiVersion: z.string().min(1),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  topK: z.number().optional(),
  anthropicBetaFlags: z.array(z.string()).optional(),
});

/**
 * Type-safe configuration interface for Bedrock Claude provider.
 * Extends base config with Claude-specific apiVersion and anthropicBetaFlags properties.
 */
export interface BedrockClaudeProviderConfig extends LLMProviderSpecificConfig {
  apiVersion: string;
  temperature?: number;
  topP?: number;
  topK?: number;
  anthropicBetaFlags?: readonly string[];
}

/**
 * Type guard to check if a config is a valid BedrockClaudeProviderConfig.
 * Uses Zod schema validation for robust type checking.
 */
export function isBedrockClaudeProviderConfig(
  config: LLMProviderSpecificConfig,
): config is BedrockClaudeProviderConfig {
  return BedrockClaudeProviderConfigSchema.safeParse(config).success;
}
