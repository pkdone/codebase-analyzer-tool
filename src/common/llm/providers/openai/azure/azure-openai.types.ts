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
 * Type guard to check if an object is a valid AzureOpenAIConfig.
 */
export function isAzureOpenAIConfig(obj: unknown): obj is AzureOpenAIConfig {
  if (!obj || typeof obj !== "object") return false;
  const config = obj as Record<string, unknown>;
  return typeof config.apiKey === "string" && typeof config.endpoint === "string";
}
