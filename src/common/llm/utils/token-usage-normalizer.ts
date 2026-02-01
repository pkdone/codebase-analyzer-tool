import type { LLMResponseTokensUsage } from "../types/llm-response.types";
import type { ResolvedLLMModelMetadata } from "../types/llm-model.types";
import { llmConfig } from "../config/llm.config";

/**
 * Normalizes token usage data by defaulting missing values from model metadata
 * and estimating prompt tokens when not provided.
 *
 * This function handles the common case where LLM responses indicate token limit
 * exceeded but don't provide complete token usage information. It ensures:
 * - Completion tokens default to 0 if unknown
 * - Max total tokens are resolved from model metadata if unknown
 * - Prompt tokens are estimated from request length if unknown, intentionally
 *   set to exceed the limit to trigger cropping behavior
 *
 * @param modelKey - The key identifying the model in the metadata
 * @param tokenUsage - Raw token usage data (undefined values indicate unknown)
 * @param modelsMetadata - Metadata for available models
 * @param request - The original request content (used for prompt token estimation)
 * @returns Normalized token usage with all values resolved to defined numbers
 */
export function normalizeTokenUsage(
  modelKey: string,
  tokenUsage: LLMResponseTokensUsage,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  request: string,
): Required<LLMResponseTokensUsage> {
  // Default completion tokens to 0 if unknown
  const completionTokens = tokenUsage.completionTokens ?? 0;

  // Resolve max total tokens from model metadata if unknown
  const maxTotalTokens = tokenUsage.maxTotalTokens ?? modelsMetadata[modelKey].maxTotalTokens;

  // Estimate prompt tokens if unknown, ensuring the value exceeds the limit
  // to trigger cropping behavior in the execution pipeline
  let promptTokens = tokenUsage.promptTokens;
  if (promptTokens === undefined) {
    const estimatedPromptTokensConsumed = Math.floor(
      request.length / llmConfig.AVERAGE_CHARS_PER_TOKEN,
    );
    // Use Math.max to ensure estimated tokens exceed the limit, triggering cropping
    promptTokens = Math.max(estimatedPromptTokensConsumed, maxTotalTokens + 1);
  }

  return { promptTokens, completionTokens, maxTotalTokens };
}
