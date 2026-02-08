import { z } from "zod";
import { createProviderConfigValidator } from "../../common/provider-config-validator";

/**
 * Zod schema for VertexAI Gemini provider configuration.
 * Validates that the config contains all required fields.
 */
export const VertexAIGeminiConfigSchema = z.object({
  projectId: z.string().min(1),
  embeddingsLocation: z.string().min(1),
  completionsLocation: z.string().min(1),
});

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
 * Type guard and assertion functions for VertexAI Gemini config validation.
 */
const { isValid, assert } = createProviderConfigValidator<VertexAIGeminiConfig>(
  VertexAIGeminiConfigSchema,
  "VertexAI Gemini",
);

/**
 * Type guard to check if an object is a valid VertexAIGeminiConfig.
 * Returns a boolean for use in conditional type narrowing.
 *
 * @param obj - The object to validate
 * @returns True if the object is a valid VertexAIGeminiConfig
 */
export const isVertexAIGeminiConfig = isValid;

/**
 * Validates and asserts that an object is a valid VertexAIGeminiConfig.
 * Throws an LLMError if validation fails, centralizing validation in the manifest layer.
 *
 * @param obj - The object to validate
 * @returns The validated VertexAIGeminiConfig
 * @throws LLMError with BAD_CONFIGURATION code if validation fails
 */
export const assertVertexAIGeminiConfig = assert;
