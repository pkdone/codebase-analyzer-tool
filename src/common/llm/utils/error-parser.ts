import { ResolvedLLMModelMetadata } from "../types/llm-model.types";
import { LLMErrorMsgRegExPattern, TokenErrorGroups } from "../types/llm-stats.types";
import { LLMResponseTokensUsage } from "../types/llm-response.types";
import { llmConfig } from "../config/llm.config";

/**
 * Default result when no pattern matches or parsing fails.
 */
const DEFAULT_RESULT: LLMResponseTokensUsage = {
  promptTokens: -1,
  completionTokens: 0,
  maxTotalTokens: -1,
};

/**
 * Safely parses a string to an integer, returning fallback if undefined or NaN.
 */
function parseIntOrFallback(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Extract token values from named capture groups for token-based patterns.
 * Uses semantic names (max, prompt, completion) for clarity.
 */
function extractTokenValues(
  groups: TokenErrorGroups,
  fallbackMaxTokens: number,
): LLMResponseTokensUsage {
  const maxTotalTokens = parseIntOrFallback(groups.max, -1);
  const promptTokens = parseIntOrFallback(groups.prompt, -1);
  const completionTokens = parseIntOrFallback(groups.completion, 0);

  return {
    maxTotalTokens: maxTotalTokens > 0 ? maxTotalTokens : fallbackMaxTokens,
    promptTokens,
    completionTokens,
  };
}

/**
 * Extract char values from named capture groups and convert to token estimates.
 * Uses charLimit and charPrompt groups for character-based error messages.
 */
function extractCharValues(
  groups: TokenErrorGroups,
  modelKey: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>,
): LLMResponseTokensUsage {
  const charLimit = parseIntOrFallback(groups.charLimit, -1);
  const charPrompt = parseIntOrFallback(groups.charPrompt, -1);

  if (charLimit <= 0 || charPrompt <= 0) {
    return { ...DEFAULT_RESULT };
  }

  return calculateTokensFromChars(charPrompt, charLimit, modelKey, llmModelsMetadata);
}

/**
 * Extract token usage information from LLM error message.
 * Internal function used by calculateTokenUsageFromError.
 * Uses named capture groups for clear, maintainable pattern matching.
 */
function parseTokenUsageFromLLMError(
  modelKey: string,
  errorMsg: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  errorPatterns?: readonly LLMErrorMsgRegExPattern[],
): LLMResponseTokensUsage {
  if (!errorPatterns) return { ...DEFAULT_RESULT };

  const fallbackMaxTokens = llmModelsMetadata[modelKey].maxTotalTokens;

  for (const pattern of errorPatterns) {
    const matches = errorMsg.match(pattern.pattern);
    if (!matches?.groups) continue;

    const groups = matches.groups as TokenErrorGroups;

    if (pattern.units === "tokens") {
      return extractTokenValues(groups, fallbackMaxTokens);
    } else {
      return extractCharValues(groups, modelKey, llmModelsMetadata);
    }
  }

  return { ...DEFAULT_RESULT };
}

/**
 * Calculate token usage from character measurements
 */
function calculateTokensFromChars(
  charsPrompt: number,
  charsLimit: number,
  modelKey: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>,
): LLMResponseTokensUsage {
  const maxTotalTokens = llmModelsMetadata[modelKey].maxTotalTokens;
  const promptTokensDerived = Math.ceil((charsPrompt / charsLimit) * maxTotalTokens);

  return {
    maxTotalTokens,
    promptTokens: Math.max(promptTokensDerived, maxTotalTokens + 1),
    completionTokens: 0,
  };
}

/**
 * Calculate token usage information and limit from LLM error message. Derives values
 * for all prompt/completions/maxTokens if not found in the error message.
 */
export function calculateTokenUsageFromError(
  modelKey: string,
  prompt: string,
  errorMsg: string,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  errorPatterns?: readonly LLMErrorMsgRegExPattern[],
): LLMResponseTokensUsage {
  const {
    maxTotalTokens: parsedMaxTokens,
    promptTokens: parsedPromptTokens,
    completionTokens,
  } = parseTokenUsageFromLLMError(modelKey, errorMsg, modelsMetadata, errorPatterns);
  const publishedMaxTotalTokens = modelsMetadata[modelKey].maxTotalTokens;
  let maxTotalTokens = parsedMaxTokens;
  let promptTokens = parsedPromptTokens;

  if (promptTokens < 0) {
    const assumedMaxTotalTokens = maxTotalTokens > 0 ? maxTotalTokens : publishedMaxTotalTokens;
    const estimatedPromptTokensConsumed = Math.floor(
      prompt.length / llmConfig.AVERAGE_CHARS_PER_TOKEN,
    );
    promptTokens = Math.max(estimatedPromptTokensConsumed, assumedMaxTotalTokens + 1);
  }

  if (maxTotalTokens <= 0) maxTotalTokens = publishedMaxTotalTokens;
  return { promptTokens, completionTokens, maxTotalTokens };
}
