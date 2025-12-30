/**
 * Shared constants and factory functions for Bedrock model configuration.
 * These are used across multiple Bedrock provider manifests to avoid duplication.
 *
 * Note: Model family constants (BEDROCK_*_FAMILY) have been moved to their respective
 * manifest files to make each provider self-contained. Only truly shared constants remain here.
 */

import { z } from "zod";
import { LLMPurpose } from "../../../types/llm.types";

// Shared environment variable name constants
export const BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY = "BEDROCK_TITAN_EMBEDDINGS_MODEL";

// Shared model internal key constants
export const AWS_EMBEDDINGS_TITAN_V1 = "AWS_EMBEDDINGS_TITAN_V1";

/**
 * Default dimensions for Titan Embeddings model.
 * Most Bedrock providers use 1024; Llama uses 1536.
 */
const DEFAULT_TITAN_EMBEDDINGS_DIMENSIONS = 1024;

/**
 * Factory function to create the Titan Embeddings model configuration.
 * Reduces duplication across all Bedrock provider manifests.
 *
 * @param dimensions - The embedding dimensions (default: 1024, use 1536 for Llama)
 * @returns The embeddings model configuration object
 */
export function createTitanEmbeddingsConfig(dimensions = DEFAULT_TITAN_EMBEDDINGS_DIMENSIONS) {
  return {
    modelKey: AWS_EMBEDDINGS_TITAN_V1,
    name: "Titan Embeddings v1",
    urnEnvKey: BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY,
    purpose: LLMPurpose.EMBEDDINGS,
    dimensions,
    maxTotalTokens: 8192,
  } as const;
}

/**
 * Helper function to create the envSchema for Bedrock provider manifests.
 * All Bedrock providers require the Titan embeddings model key plus their own specific keys.
 *
 * @param additionalKeys - Additional environment variable keys required by the specific provider
 * @returns A Zod schema object for environment validation
 */
export function createBedrockEnvSchema(additionalKeys: Record<string, z.ZodString>) {
  return z.object({
    [BEDROCK_TITAN_EMBEDDINGS_MODEL_KEY]: z.string().min(1),
    ...additionalKeys,
  });
}
