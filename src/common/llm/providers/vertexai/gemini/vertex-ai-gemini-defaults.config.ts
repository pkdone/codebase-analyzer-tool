import type { LLMProviderSpecificConfig } from "../../llm-provider.types";
import { DEFAULT_PROVIDER_CONFIG } from "../../../config/llm.config";

/**
 * Default provider-specific configuration for Vertex AI Gemini providers.
 * Inherits from system-wide defaults with Vertex AI-specific overrides.
 *
 * Vertex AI-specific tuning:
 * - Longer timeout (10 min) for Gemini's potentially longer inference times
 * - Longer retry delays to accommodate GCP's throttling patterns
 */
export const defaultVertexAIProviderConfig: Pick<
  LLMProviderSpecificConfig,
  "requestTimeoutMillis" | "maxRetryAttempts" | "minRetryDelayMillis" | "maxRetryDelayMillis"
> = {
  ...DEFAULT_PROVIDER_CONFIG,
  // Vertex AI-specific overrides
  requestTimeoutMillis: 10 * 60 * 1000,
  minRetryDelayMillis: 30 * 1000,
  maxRetryDelayMillis: 150 * 1000,
} as const;
