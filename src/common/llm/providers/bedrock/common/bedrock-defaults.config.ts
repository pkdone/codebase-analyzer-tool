import type { LLMProviderSpecificConfig } from "../../llm-provider.types";
import { DEFAULT_PROVIDER_CONFIG } from "../../../config/llm.config";

/**
 * Default provider-specific configuration for AWS Bedrock LLM providers.
 * Inherits from system-wide defaults with Bedrock-specific overrides.
 *
 * Bedrock-specific tuning:
 * - Longer timeout (8 min) to accommodate Bedrock's inference times
 * - Extra retry attempt (4 total) for resilience against throttling
 * - Longer retry delays for Bedrock's rate limiting patterns
 */
export const defaultBedrockProviderConfig: Pick<
  LLMProviderSpecificConfig,
  "requestTimeoutMillis" | "maxRetryAttempts" | "minRetryDelayMillis" | "maxRetryDelayMillis"
> = {
  ...DEFAULT_PROVIDER_CONFIG,
  // Bedrock-specific overrides
  requestTimeoutMillis: 8 * 60 * 1000,
  maxRetryAttempts: 4,
  minRetryDelayMillis: 25 * 1000,
  maxRetryDelayMillis: 240 * 1000,
} as const;
