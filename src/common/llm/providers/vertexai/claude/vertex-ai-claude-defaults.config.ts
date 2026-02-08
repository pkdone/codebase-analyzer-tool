import type { LLMProviderSpecificConfig } from "../../llm-provider.types";
import { DEFAULT_PROVIDER_CONFIG } from "../../../config/llm.config";

/**
 * Default provider-specific configuration for Vertex AI Claude providers.
 * Inherits from system-wide defaults with Vertex AI Claude-specific overrides.
 *
 * Vertex AI Claude-specific tuning:
 * - Timeout under 10 minutes (SDK limit for non-streaming requests)
 * - Longer retry delays to accommodate GCP's throttling patterns
 *
 * Note: The Anthropic SDK requires streaming for requests with timeouts > 10 minutes.
 * Since we use non-streaming requests, the timeout must stay under this limit.
 */
export const defaultVertexAIClaudeProviderConfig: Pick<
  LLMProviderSpecificConfig,
  "requestTimeoutMillis" | "maxRetryAttempts" | "minRetryDelayMillis" | "maxRetryDelayMillis"
> = {
  ...DEFAULT_PROVIDER_CONFIG,
  // Vertex AI Claude-specific overrides
  // SDK enforces 10-minute max for non-streaming; use 9.5 minutes for safety margin
  requestTimeoutMillis: 9.5 * 60 * 1000,
  minRetryDelayMillis: 30 * 1000,
  maxRetryDelayMillis: 200 * 1000,
} as const;
