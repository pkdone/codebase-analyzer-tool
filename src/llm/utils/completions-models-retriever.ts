import {
  LLMModelQuality,
  LLMCandidateFunction,
  LLMFunction,
  LLMProvider,
  LLMContext,
  LLMCompletionOptions,
} from "../types/llm.types";
import { BadConfigurationLLMError } from "../types/llm-errors.types";

/**
 * Build completion candidates from the LLM provider.
 * Uses wrapper functions instead of .bind() to support generic methods.
 */
export function buildCompletionCandidates(llm: LLMProvider): LLMCandidateFunction[] {
  const candidates: LLMCandidateFunction[] = [];

  // Add primary completion model as first candidate
  // Wrapper function preserves generic type parameter
  candidates.push({
    func: async <T>(content: string, context: LLMContext, options?: LLMCompletionOptions) =>
      llm.executeCompletionPrimary<T>(content, context, options),
    modelQuality: LLMModelQuality.PRIMARY,
    description: "Primary completion model",
  });

  // Add secondary completion model as fallback if available
  const availableQualities = llm.getAvailableCompletionModelQualities();
  if (availableQualities.includes(LLMModelQuality.SECONDARY)) {
    // Wrapper function preserves generic type parameter
    candidates.push({
      func: async <T>(content: string, context: LLMContext, options?: LLMCompletionOptions) =>
        llm.executeCompletionSecondary<T>(content, context, options),
      modelQuality: LLMModelQuality.SECONDARY,
      description: "Secondary completion model (fallback)",
    });
  }

  return candidates;
}

/**
 * Get completion candidates based on model quality override.
 */
export function getOverriddenCompletionCandidates(
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
