import { ResolvedLLMModelMetadata } from "../types/llm-model.types";
import { LLMErrorMsgRegExPattern } from "../types/llm-stats.types";
import { LLMResponseTokensUsage } from "../types/llm-response.types";
import { llmProviderConfig } from "../config/llm.config";

/** Capture group indices for regex matches */
const FIRST_VALUE_INDEX = 1;
const SECOND_VALUE_INDEX = 2;
const COMPLETION_TOKENS_INDEX = 3;

/**
 * Default result when no pattern matches or parsing fails.
 */
const DEFAULT_RESULT: LLMResponseTokensUsage = {
  promptTokens: -1,
  completionTokens: 0,
  maxTotalTokens: -1,
};

/**
 * Extracts an integer from a regex match at the given index.
 * Returns the fallback value if the index is out of bounds.
 */
function extractMatchValue(matches: RegExpMatchArray, index: number, fallback: number): number {
  return matches.length > index ? parseInt(matches[index], 10) : fallback;
}

/**
 * Extract token values from regex matches for token-based patterns.
 * Maps capture groups to promptTokens and maxTotalTokens based on isMaxFirst flag.
 */
function extractTokenValues(
  matches: RegExpMatchArray,
  isMaxFirst: boolean,
  fallbackMaxTokens: number,
): LLMResponseTokensUsage {
  const firstValue = extractMatchValue(matches, FIRST_VALUE_INDEX, -1);
  const secondValue = extractMatchValue(matches, SECOND_VALUE_INDEX, fallbackMaxTokens);
  const completionTokens = extractMatchValue(matches, COMPLETION_TOKENS_INDEX, 0);

  return isMaxFirst
    ? {
        maxTotalTokens: firstValue,
        promptTokens:
          secondValue === fallbackMaxTokens && matches.length <= SECOND_VALUE_INDEX
            ? -1
            : secondValue,
        completionTokens,
      }
    : {
        promptTokens: firstValue,
        maxTotalTokens: secondValue,
        completionTokens,
      };
}

/**
 * Extract char values from regex matches and convert to token estimates.
 * Maps capture groups to charsPrompt and charsLimit based on isMaxFirst flag.
 */
function extractCharValues(
  matches: RegExpMatchArray,
  isMaxFirst: boolean,
  modelKey: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>,
): LLMResponseTokensUsage {
  if (matches.length <= SECOND_VALUE_INDEX) {
    return { ...DEFAULT_RESULT };
  }

  const firstValue = parseInt(matches[FIRST_VALUE_INDEX], 10);
  const secondValue = parseInt(matches[SECOND_VALUE_INDEX], 10);

  const charsLimit = isMaxFirst ? firstValue : secondValue;
  const charsPrompt = isMaxFirst ? secondValue : firstValue;

  return calculateTokensFromChars(charsPrompt, charsLimit, modelKey, llmModelsMetadata);
}

/**
 * Extract token usage information from LLM error message.
 * Internal function used by calculateTokenUsageFromError.
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
    if (!matches || matches.length <= 1) continue;

    if (pattern.units === "tokens") {
      return extractTokenValues(matches, pattern.isMaxFirst, fallbackMaxTokens);
    } else {
      return extractCharValues(matches, pattern.isMaxFirst, modelKey, llmModelsMetadata);
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
      prompt.length / llmProviderConfig.AVERAGE_CHARS_PER_TOKEN,
    );
    promptTokens = Math.max(estimatedPromptTokensConsumed, assumedMaxTotalTokens + 1);
  }

  if (maxTotalTokens <= 0) maxTotalTokens = publishedMaxTotalTokens;
  return { promptTokens, completionTokens, maxTotalTokens };
}
