import {
  LLMModelQuality,
  LLMCandidateFunction,
  LLMFunction,
  LLMProviderImpl,
} from "../../llm.types";
import { BadConfigurationLLMError } from "../../errors/llm-errors.types";
import { llmConfig } from "../../llm.config";
import type { LLMRetryConfig } from "../../providers/llm-provider.types";

/**
 * Build completion candidates from the LLM provider.
 */
export function buildCompletionCandidates(llm: LLMProviderImpl): LLMCandidateFunction[] {
  const candidates: LLMCandidateFunction[] = [];

  // Add primary completion model as first candidate
  candidates.push({
    func: llm.executeCompletionPrimary.bind(llm),
    modelQuality: LLMModelQuality.PRIMARY,
    description: "Primary completion model",
  });

  // Add secondary completion model as fallback if available
  const availableQualities = llm.getAvailableCompletionModelQualities();
  if (availableQualities.includes(LLMModelQuality.SECONDARY)) {
    candidates.push({
      func: llm.executeCompletionSecondary.bind(llm),
      modelQuality: LLMModelQuality.SECONDARY,
      description: "Secondary completion model (fallback)",
    });
  }

  return candidates;
}

/**
 * Get completion candidates based on model quality override.
 */
export function getOverridenCompletionCandidates(
  completionCandidates: LLMCandidateFunction[],
  modelQualityOverride: LLMModelQuality | null,
): {
  candidatesToUse: LLMCandidateFunction[];
  candidateFunctions: LLMFunction[];
} {
  // Filter candidates based on model quality override if specified
  const candidatesToUse = modelQualityOverride
    ? completionCandidates.filter((candidate) => candidate.modelQuality === modelQualityOverride)
    : completionCandidates;

  if (candidatesToUse.length === 0) {
    throw new BadConfigurationLLMError(
      modelQualityOverride
        ? `No completion candidates found for model quality: ${modelQualityOverride}`
        : "No completion candidates available",
    );
  }

  const candidateFunctions = candidatesToUse.map((candidate) => candidate.func);
  return { candidatesToUse, candidateFunctions };
}

/**
 * Get retry configuration from provider-specific config with fallbacks to global config.
 */
export function getRetryConfiguration(providerRetryConfig: LLMRetryConfig) {
  return {
    maxAttempts: providerRetryConfig.maxRetryAttempts ?? llmConfig.DEFAULT_INVOKE_LLM_NUM_ATTEMPTS,
    minRetryDelayMillis:
      providerRetryConfig.minRetryDelayMillis ?? llmConfig.DEFAULT_MIN_RETRY_DELAY_MILLIS,
    maxRetryAdditionalDelayMillis:
      providerRetryConfig.maxRetryAdditionalDelayMillis ??
      llmConfig.DEFAULT_MAX_RETRY_ADDITIONAL_MILLIS,
    requestTimeoutMillis:
      providerRetryConfig.requestTimeoutMillis ?? llmConfig.DEFAULT_REQUEST_WAIT_TIMEOUT_MILLIS,
  };
}
