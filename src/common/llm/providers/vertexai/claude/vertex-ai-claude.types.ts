import { z } from "zod";
import { LLMError, LLMErrorCode } from "../../../types/llm-errors.types";
import type { LLMProviderSpecificConfig } from "../../llm-provider.types";

/**
 * Typed configuration for VertexAI Claude provider.
 * This interface decouples the provider implementation from specific environment variable names,
 * allowing different projects to use different env var naming conventions.
 */
export interface VertexAIClaudeConfig {
  /** Index signature for compatibility with ExtractedProviderConfig */
  [key: string]: unknown;
  /** The GCP project ID */
  projectId: string;
  /** Regional location for Claude models (e.g., "us-east5") */
  location: string;
}

/**
 * Type guard to check if an object is a valid VertexAIClaudeConfig.
 * Returns a boolean for use in conditional type narrowing.
 *
 * @param obj - The object to validate
 * @returns True if the object is a valid VertexAIClaudeConfig
 */
export function isVertexAIClaudeConfig(obj: unknown): obj is VertexAIClaudeConfig {
  if (!obj || typeof obj !== "object") return false;
  const config = obj as Record<string, unknown>;
  return (
    typeof config.projectId === "string" &&
    config.projectId.length > 0 &&
    typeof config.location === "string" &&
    config.location.length > 0
  );
}

/**
 * Validates and asserts that an object is a valid VertexAIClaudeConfig.
 * Throws an LLMError if validation fails, centralizing validation in the manifest layer.
 *
 * @param obj - The object to validate
 * @returns The validated VertexAIClaudeConfig
 * @throws LLMError with BAD_CONFIGURATION code if validation fails
 */
export function assertVertexAIClaudeConfig(obj: unknown): VertexAIClaudeConfig {
  if (!obj || typeof obj !== "object") {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      "Invalid VertexAI Claude configuration - expected an object",
    );
  }
  const config = obj as Record<string, unknown>;
  const missingFields: string[] = [];

  if (typeof config.projectId !== "string" || config.projectId.length === 0) {
    missingFields.push("projectId");
  }
  if (typeof config.location !== "string" || config.location.length === 0) {
    missingFields.push("location");
  }

  if (missingFields.length > 0) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Invalid VertexAI Claude configuration - missing or empty required fields: ${missingFields.join(", ")}`,
    );
  }

  return config as VertexAIClaudeConfig;
}

/**
 * Zod schema for VertexAI Claude provider-specific configuration.
 * Validates that the providerSpecificConfig contains all required fields,
 * including the anthropicBetaFlags property for extended context windows.
 */
export const VertexAIClaudeProviderConfigSchema = z.object({
  requestTimeoutMillis: z.number().int().positive(),
  maxRetryAttempts: z.number().int().nonnegative(),
  minRetryDelayMillis: z.number().int().nonnegative(),
  maxRetryDelayMillis: z.number().int().nonnegative(),
  temperature: z.number().optional(),
  topP: z.number().optional(),
  topK: z.number().optional(),
  anthropicBetaFlags: z.array(z.string()).optional(),
});

/**
 * Type-safe configuration interface for VertexAI Claude provider.
 * Extends base config with Claude-specific anthropicBetaFlags property for 1M context.
 */
export interface VertexAIClaudeProviderConfig extends LLMProviderSpecificConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  anthropicBetaFlags?: readonly string[];
}

/**
 * Type guard to check if a config is a valid VertexAIClaudeProviderConfig.
 * Uses Zod schema validation for robust type checking.
 */
export function isVertexAIClaudeProviderConfig(
  config: LLMProviderSpecificConfig,
): config is VertexAIClaudeProviderConfig {
  return VertexAIClaudeProviderConfigSchema.safeParse(config).success;
}
