import { z } from "zod";
import { createProviderConfigValidator } from "../../common/provider-config-validator";

/**
 * Zod schema for Azure OpenAI provider configuration.
 * Validates that the config contains all required fields.
 */
export const AzureOpenAIConfigSchema = z.object({
  apiKey: z.string().min(1),
  endpoint: z.string().min(1),
});

/**
 * Typed configuration for Azure OpenAI provider.
 * This interface decouples the provider implementation from specific environment variable names,
 * allowing different projects to use different env var naming conventions.
 */
export interface AzureOpenAIConfig {
  /** Index signature for compatibility with ExtractedProviderConfig */
  [key: string]: unknown;
  /** The Azure OpenAI API key */
  apiKey: string;
  /** The Azure OpenAI endpoint URL */
  endpoint: string;
}

/**
 * Type guard and assertion functions for Azure OpenAI config validation.
 */
const { isValid, assert } = createProviderConfigValidator<AzureOpenAIConfig>(
  AzureOpenAIConfigSchema,
  "Azure OpenAI",
);

/**
 * Type guard to check if an object is a valid AzureOpenAIConfig.
 */
export const isAzureOpenAIConfig = isValid;

/**
 * Validates and asserts that an object is a valid AzureOpenAIConfig.
 * Throws an LLMError if validation fails, centralizing validation in the manifest layer.
 *
 * @param obj - The object to validate
 * @returns The validated AzureOpenAIConfig
 * @throws LLMError with BAD_CONFIGURATION code if validation fails
 */
export const assertAzureOpenAIConfig = assert;
