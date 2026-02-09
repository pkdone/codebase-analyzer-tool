import { z } from "zod";
import type { LLMProviderSpecificConfig } from "../../llm-provider.types";
import { createProviderConfigValidator } from "../../common/provider-config-validator";

/**
 * Zod schema for VertexAI Claude extracted config validation.
 * Validates that the config contains all required fields.
 */
export const VertexAIClaudeConfigSchema = z.object({
  projectId: z.string().min(1),
  location: z.string().min(1),
});

/**
 * Typed configuration for VertexAI Claude provider.
 * This interface decouples the provider implementation from specific environment variable names,
 * allowing different projects to use different env var naming conventions.
 */
export interface VertexAIClaudeConfig {
  /** Index signature required for ExtractedProviderConfig compatibility */
  [key: string]: unknown;
  /** The GCP project ID */
  projectId: string;
  /** Regional location for Claude models (e.g., "us-east5") */
  location: string;
}

/**
 * Type guard and assertion functions for VertexAI Claude config validation.
 */
const { isValid, assert } = createProviderConfigValidator<VertexAIClaudeConfig>(
  VertexAIClaudeConfigSchema,
  "VertexAI Claude",
);

/**
 * Type guard to check if an object is a valid VertexAIClaudeConfig.
 * Returns a boolean for use in conditional type narrowing.
 *
 * @param obj - The object to validate
 * @returns True if the object is a valid VertexAIClaudeConfig
 */
export const isVertexAIClaudeConfig = isValid;

/**
 * Validates and asserts that an object is a valid VertexAIClaudeConfig.
 * Throws an LLMError if validation fails, centralizing validation in the manifest layer.
 *
 * @param obj - The object to validate
 * @returns The validated VertexAIClaudeConfig
 * @throws LLMError with BAD_CONFIGURATION code if validation fails
 */
export const assertVertexAIClaudeConfig = assert;

/**
 * Zod schema for VertexAI Claude provider-specific configuration.
 * Validates that the providerSpecificConfig contains all required fields,
 * including the anthropicBetaFlags property for extended context windows.
 */
export const VertexAIClaudeProviderConfigSchema = z.object({
  requestTimeoutMillis: z.number().int().positive(),
  maxRetryAttempts: z.number().int().nonnegative(),
  minRetryDelayMillis: z.number().int().nonnegative(),
  maxRetryDelayMillis: z.number().int().nonnegative(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  topK: z.number().optional(),
  anthropicBetaFlags: z.array(z.string()).optional(),
});

/**
 * Type-safe configuration interface for VertexAI Claude provider.
 * Extends base config with Claude-specific anthropicBetaFlags property for 1M context.
 */
export interface VertexAIClaudeProviderConfig extends LLMProviderSpecificConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  anthropicBetaFlags?: readonly string[];
}

/**
 * Type guard to check if a config is a valid VertexAIClaudeProviderConfig.
 * Uses Zod schema validation for robust type checking.
 */
export function isVertexAIClaudeProviderConfig(
  config: LLMProviderSpecificConfig,
): config is VertexAIClaudeProviderConfig {
  return VertexAIClaudeProviderConfigSchema.safeParse(config).success;
}
