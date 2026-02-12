import { z } from "zod";

/**
 * Shared environment variable key for the GCP project ID.
 * Used by both the VertexAI Claude and VertexAI Gemini providers.
 */
export const VERTEXAI_PROJECTID_KEY = "VERTEXAI_PROJECTID";

/**
 * Shared environment variable key for the completions endpoint location.
 * Used by both the VertexAI Claude and VertexAI Gemini providers.
 */
export const VERTEXAI_COMPLETIONS_LOCATION_KEY = "VERTEXAI_COMPLETIONS_LOCATION";

/**
 * Zod schema for the base Vertex AI environment configuration shared
 * across all Vertex AI providers. Validates projectId and completions location.
 */
export const vertexAIBaseEnvSchema = z.object({
  [VERTEXAI_PROJECTID_KEY]: z.string().min(1),
  [VERTEXAI_COMPLETIONS_LOCATION_KEY]: z.string().min(1),
});

/**
 * Base configuration fields shared by all Vertex AI providers.
 * Each provider extends this with its own additional fields.
 */
export interface VertexAIBaseEnvConfig {
  /** The GCP project ID */
  projectId: string;
  /** Regional location for completions */
  completionsLocation: string;
}

/**
 * Extracts the base Vertex AI configuration (projectId and completions location)
 * from the raw provider parameters populated by environment variables.
 * Provider-specific manifests can spread this result into their own config objects.
 *
 * @param providerParams - The raw environment parameters keyed by env variable name
 * @returns An object containing projectId and completionsLocation
 */
export function extractVertexAIBaseConfig(
  providerParams: Record<string, unknown>,
): VertexAIBaseEnvConfig {
  return {
    projectId: providerParams[VERTEXAI_PROJECTID_KEY] as string,
    completionsLocation: providerParams[VERTEXAI_COMPLETIONS_LOCATION_KEY] as string,
  };
}
