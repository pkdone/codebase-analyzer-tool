import { z } from "zod";
import { createProviderConfigValidator } from "../../common/provider-config-validator";

/**
 * Zod schema for OpenAI provider configuration.
 * Validates that the config contains all required fields.
 */
export const OpenAIConfigSchema = z.object({
  apiKey: z.string().min(1),
});

/**
 * Typed configuration for OpenAI provider.
 * This interface decouples the provider implementation from specific environment variable names,
 * allowing different projects to use different env var naming conventions.
 */
export interface OpenAIConfig {
  /** Index signature for compatibility with ExtractedProviderConfig */
  [key: string]: unknown;
  /** The OpenAI API key */
  apiKey: string;
}

/**
 * Type guard and assertion functions for OpenAI config validation.
 */
const { isValid, assert } = createProviderConfigValidator<OpenAIConfig>(
  OpenAIConfigSchema,
  "OpenAI",
);

/**
 * Type guard to check if an object is a valid OpenAIConfig.
 * Returns a boolean for use in conditional type narrowing.
 *
 * @param obj - The object to validate
 * @returns True if the object is a valid OpenAIConfig
 */
export const isOpenAIConfig = isValid;

/**
 * Validates and asserts that an object is a valid OpenAIConfig.
 * Throws an LLMError if validation fails, centralizing validation in the manifest layer.
 *
 * @param obj - The object to validate
 * @returns The validated OpenAIConfig
 * @throws LLMError with BAD_CONFIGURATION code if validation fails
 */
export const assertOpenAIConfig = assert;
