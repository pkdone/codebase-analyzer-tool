import { ResolvedLLMModelMetadata } from "../types/llm-model.types";
import { LLMErrorMsgRegExPattern, TokenErrorGroups } from "../types/llm-stats.types";
import { LLMResponseTokensUsage } from "../types/llm-response.types";
import { llmConfig } from "../config/llm.config";

/**
 * Default result when no pattern matches or parsing fails.
 * Uses undefined to indicate unknown values (idiomatic TypeScript).
 */
const DEFAULT_RESULT: LLMResponseTokensUsage = {
  promptTokens: undefined,
  completionTokens: 0,
  maxTotalTokens: undefined,
};

/**
 * Safely parses a string to an integer, returning undefined if the string is
 * undefined or produces NaN.
 */
function parseIntOrUndefined(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * Extract token values from named capture groups for token-based patterns.
 * Uses semantic names (max, prompt, completion) for clarity.
 */
function extractTokenValues(
  groups: TokenErrorGroups,
  fallbackMaxTokens: number,
): LLMResponseTokensUsage {
  const maxTotalTokens = parseIntOrUndefined(groups.max);
  const promptTokens = parseIntOrUndefined(groups.prompt);
  const completionTokens = parseIntOrUndefined(groups.completion) ?? 0;

  return {
    maxTotalTokens:
      maxTotalTokens !== undefined && maxTotalTokens > 0 ? maxTotalTokens : fallbackMaxTokens,
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
  const charLimit = parseIntOrUndefined(groups.charLimit);
  const charPrompt = parseIntOrUndefined(groups.charPrompt);

  if (charLimit === undefined || charLimit <= 0 || charPrompt === undefined || charPrompt <= 0) {
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
 * Returns a fully-resolved token usage record with all values defined.
 */
export function calculateTokenUsageFromError(
  modelKey: string,
  prompt: string,
  errorMsg: string,
  modelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  errorPatterns?: readonly LLMErrorMsgRegExPattern[],
): Required<LLMResponseTokensUsage> {
  const {
    maxTotalTokens: parsedMaxTokens,
    promptTokens: parsedPromptTokens,
    completionTokens: parsedCompletionTokens,
  } = parseTokenUsageFromLLMError(modelKey, errorMsg, modelsMetadata, errorPatterns);
  const publishedMaxTotalTokens = modelsMetadata[modelKey].maxTotalTokens;

  // Resolve maxTotalTokens: use parsed value if valid, otherwise fall back to metadata
  const maxTotalTokens =
    parsedMaxTokens !== undefined && parsedMaxTokens > 0
      ? parsedMaxTokens
      : publishedMaxTotalTokens;

  // Resolve completionTokens: default to 0 if undefined
  const completionTokens = parsedCompletionTokens ?? 0;

  // Resolve promptTokens: estimate if undefined
  let promptTokens = parsedPromptTokens;

  if (promptTokens === undefined) {
    const estimatedPromptTokensConsumed = Math.floor(
      prompt.length / llmConfig.AVERAGE_CHARS_PER_TOKEN,
    );
    promptTokens = Math.max(estimatedPromptTokensConsumed, maxTotalTokens + 1);
  }

  return { promptTokens, completionTokens, maxTotalTokens };
}
