import {
  ResolvedLLMModelMetadata,
  LLMErrorMsgRegExPattern,
  LLMResponseTokensUsage,
} from "../../llm.types";
import { llmConfig } from "../../llm.config";

/**
 * Extract token usage information from LLM error message.
 */
export function parseTokenUsageFromLLMError(
  modelKey: string,
  errorMsg: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>,
  errorPatterns?: readonly LLMErrorMsgRegExPattern[],
): LLMResponseTokensUsage {
  const defaultResult: LLMResponseTokensUsage = {
    promptTokens: -1,
    completionTokens: 0,
    maxTotalTokens: -1,
  };

  if (!errorPatterns) return defaultResult;

  for (const pattern of errorPatterns) {
    const matches = errorMsg.match(pattern.pattern);
    if (!matches || matches.length <= 1) continue;

    if (pattern.units === "tokens") {
      return pattern.isMaxFirst
        ? processTokenMatchMaxFirst(matches)
        : processTokenMatchPromptFirst(matches, modelKey, llmModelsMetadata);
    } else {
      return pattern.isMaxFirst
        ? processCharMatchMaxFirst(matches, modelKey, llmModelsMetadata)
        : processCharMatchPromptFirst(matches, modelKey, llmModelsMetadata);
    }
  }

  return defaultResult;
}

/**
 * Extract token values from a regex match when max tokens is the first capture group
 */
function processTokenMatchMaxFirst(matches: RegExpMatchArray): LLMResponseTokensUsage {
  return {
    maxTotalTokens: parseInt(matches[1], 10),
    promptTokens: matches.length > 2 ? parseInt(matches[2], 10) : -1,
    completionTokens: matches.length > 3 ? parseInt(matches[3], 10) : 0,
  };
}

/**
 * Extract token values from a regex match when prompt tokens is the first capture group
 */
function processTokenMatchPromptFirst(
  matches: RegExpMatchArray,
  modelKey: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>,
): LLMResponseTokensUsage {
  return {
    promptTokens: parseInt(matches[1], 10),
    maxTotalTokens:
      matches.length > 2 ? parseInt(matches[2], 10) : llmModelsMetadata[modelKey].maxTotalTokens,
    completionTokens: matches.length > 3 ? parseInt(matches[3], 10) : 0,
  };
}

/**
 * Processes regex match for a char-based error pattern where max chars come first
 */
function processCharMatchMaxFirst(
  matches: RegExpMatchArray,
  modelKey: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>,
): LLMResponseTokensUsage {
  if (matches.length <= 2) {
    return { maxTotalTokens: -1, promptTokens: -1, completionTokens: 0 };
  }

  const charsLimit = parseInt(matches[1], 10);
  const charsPrompt = parseInt(matches[2], 10);

  return calculateTokensFromChars(charsPrompt, charsLimit, modelKey, llmModelsMetadata);
}

/**
 * Processes regex match for a char-based error pattern where prompt chars come first
 */
function processCharMatchPromptFirst(
  matches: RegExpMatchArray,
  modelKey: string,
  llmModelsMetadata: Record<string, ResolvedLLMModelMetadata>,
): LLMResponseTokensUsage {
  if (matches.length <= 2) {
    return { maxTotalTokens: -1, promptTokens: -1, completionTokens: 0 };
  }

  const charsPrompt = parseInt(matches[1], 10);
  const charsLimit = parseInt(matches[2], 10);

  return calculateTokensFromChars(charsPrompt, charsLimit, modelKey, llmModelsMetadata);
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
 * Extract token usage information and limit from LLM error message. Derives values
 * for all prompt/completions/maxTokens if not found in the error message.
 */
export function extractTokensAmountAndLimitFromErrorMsg(
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
      prompt.length / llmConfig.MODEL_CHARS_PER_TOKEN_ESTIMATE,
    );
    promptTokens = Math.max(estimatedPromptTokensConsumed, assumedMaxTotalTokens + 1);
  }

  if (maxTotalTokens <= 0) maxTotalTokens = publishedMaxTotalTokens;
  return { promptTokens, completionTokens, maxTotalTokens };
}
