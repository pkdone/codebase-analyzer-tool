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
 * Type guard to check if an object is a valid OpenAIConfig.
 */
export function isOpenAIConfig(obj: unknown): obj is OpenAIConfig {
  if (!obj || typeof obj !== "object") return false;
  const config = obj as Record<string, unknown>;
  return typeof config.apiKey === "string";
}
