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
 * Type guard to check if an object is a valid VertexAIGeminiConfig.
 */
export function isVertexAIGeminiConfig(obj: unknown): obj is VertexAIGeminiConfig {
  if (!obj || typeof obj !== "object") return false;
  const config = obj as Record<string, unknown>;
  return (
    typeof config.projectId === "string" &&
    typeof config.embeddingsLocation === "string" &&
    typeof config.completionsLocation === "string"
  );
}
