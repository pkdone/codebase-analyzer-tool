import { LLMModelTier, LLMCandidateFunction, LLMFunction, LLMProvider } from "../types/llm.types";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";

/**
 * Build completion candidates from the LLM provider.
 * The completion methods are arrow function properties that preserve `this` context,
 * so no .bind() is needed. The LLMFunction type infers return types from options at the call site.
 */
export function buildCompletionCandidates(llm: LLMProvider): LLMCandidateFunction[] {
  const candidates: LLMCandidateFunction[] = [];

  // Add primary completion model as first candidate
  candidates.push({
    func: llm.executeCompletionPrimary,
    modelTier: LLMModelTier.PRIMARY,
    description: "Primary completion model",
  });

  // Add secondary completion model as fallback if available
  const availableTiers = llm.getAvailableCompletionModelTiers();
  if (availableTiers.includes(LLMModelTier.SECONDARY)) {
    candidates.push({
      func: llm.executeCompletionSecondary,
      modelTier: LLMModelTier.SECONDARY,
      description: "Secondary completion model (fallback)",
    });
  }

  return candidates;
}

/**
 * Get completion candidates based on model tier override.
 */
export function getOverriddenCompletionCandidates(
  completionCandidates: LLMCandidateFunction[],
  modelTierOverride: LLMModelTier | null,
): {
  candidatesToUse: LLMCandidateFunction[];
  candidateFunctions: LLMFunction[];
} {
  // Filter candidates based on model tier override if specified
  const candidatesToUse = modelTierOverride
    ? completionCandidates.filter((candidate) => candidate.modelTier === modelTierOverride)
    : completionCandidates;

  if (candidatesToUse.length === 0) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      modelTierOverride
        ? `No completion candidates found for model tier: ${modelTierOverride}`
        : "No completion candidates available",
    );
  }

  const candidateFunctions: LLMFunction[] = candidatesToUse.map((candidate) => candidate.func);
  return { candidatesToUse, candidateFunctions };
}
