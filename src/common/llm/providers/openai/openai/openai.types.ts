import { LLMError, LLMErrorCode } from "../../../types/llm-errors.types";

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
 * Validates and asserts that an object is a valid OpenAIConfig.
 * Throws an LLMError if validation fails, centralizing validation in the manifest layer.
 *
 * @param obj - The object to validate
 * @returns The validated OpenAIConfig
 * @throws LLMError with BAD_CONFIGURATION code if validation fails
 */
export function assertOpenAIConfig(obj: unknown): OpenAIConfig {
  if (!obj || typeof obj !== "object") {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      "Invalid OpenAI configuration - expected an object",
    );
  }
  const config = obj as Record<string, unknown>;
  if (typeof config.apiKey !== "string" || config.apiKey.length === 0) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      "Invalid OpenAI configuration - missing or empty apiKey",
    );
  }
  return config as OpenAIConfig;
}
