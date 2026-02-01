import { LLMError, LLMErrorCode } from "../../../types/llm-errors.types";

/**
 * Typed configuration for VertexAI Gemini provider.
 * This interface decouples the provider implementation from specific environment variable names,
 * allowing different projects to use different env var naming conventions.
 */
export interface VertexAIGeminiConfig {
  /** Index signature for compatibility with ExtractedProviderConfig */
  [key: string]: unknown;
  /** The GCP project ID */
  projectId: string;
  /** Regional location for embeddings (e.g., "us-central1") */
  embeddingsLocation: string;
  /** Location for completions (can be "global" for preview models) */
  completionsLocation: string;
}

/**
 * Validates and asserts that an object is a valid VertexAIGeminiConfig.
 * Throws an LLMError if validation fails, centralizing validation in the manifest layer.
 *
 * @param obj - The object to validate
 * @returns The validated VertexAIGeminiConfig
 * @throws LLMError with BAD_CONFIGURATION code if validation fails
 */
export function assertVertexAIGeminiConfig(obj: unknown): VertexAIGeminiConfig {
  if (!obj || typeof obj !== "object") {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      "Invalid VertexAI Gemini configuration - expected an object",
    );
  }
  const config = obj as Record<string, unknown>;
  const missingFields: string[] = [];

  if (typeof config.projectId !== "string" || config.projectId.length === 0) {
    missingFields.push("projectId");
  }
  if (typeof config.embeddingsLocation !== "string" || config.embeddingsLocation.length === 0) {
    missingFields.push("embeddingsLocation");
  }
  if (typeof config.completionsLocation !== "string" || config.completionsLocation.length === 0) {
    missingFields.push("completionsLocation");
  }

  if (missingFields.length > 0) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Invalid VertexAI Gemini configuration - missing or empty required fields: ${missingFields.join(", ")}`,
    );
  }

  return config as VertexAIGeminiConfig;
}
