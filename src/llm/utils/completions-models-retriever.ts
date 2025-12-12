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
 * Uses wrapper functions instead of .bind() for consistency.
 */
export function buildCompletionCandidates(llm: LLMProvider): LLMCandidateFunction[] {
  const candidates: LLMCandidateFunction[] = [];

  // Add primary completion model as first candidate
  candidates.push({
    func: async (content: string, context: LLMContext, options?: LLMCompletionOptions) =>
      llm.executeCompletionPrimary(content, context, options),
    modelQuality: LLMModelQuality.PRIMARY,
    description: "Primary completion model",
  });

  // Add secondary completion model as fallback if available
  const availableQualities = llm.getAvailableCompletionModelQualities();
  if (availableQualities.includes(LLMModelQuality.SECONDARY)) {
    candidates.push({
      func: async (content: string, context: LLMContext, options?: LLMCompletionOptions) =>
        llm.executeCompletionSecondary(content, context, options),
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
