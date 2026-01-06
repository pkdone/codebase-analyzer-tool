import type { LLMProviderSpecificConfig } from "../../llm-provider.types";
import { DEFAULT_PROVIDER_CONFIG } from "../../../config/llm.config";

/**
 * Default provider-specific configuration for OpenAI-family LLM providers.
 * Inherits from the system-wide defaults and can be spread into provider manifests.
 * Individual providers (e.g., Azure OpenAI) can override specific properties as needed.
 *
 * Note: OpenAI-family providers use the system defaults as-is since they represent
 * a good balance for these APIs.
 */
export const defaultOpenAIProviderConfig: Pick<
  LLMProviderSpecificConfig,
  "requestTimeoutMillis" | "maxRetryAttempts" | "minRetryDelayMillis" | "maxRetryDelayMillis"
> = {
  ...DEFAULT_PROVIDER_CONFIG,
} as const;
