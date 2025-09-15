import { injectable } from "tsyringe";
import type { LLMProvider, LLMCandidateFunction } from "../types/llm.types";
import { LLMModelQuality } from "../types/llm.types";

/**
 * Service responsible for providing human-readable descriptions and information about LLM models.
 * This separates presentation concerns from the core LLM routing logic.
 */
@injectable()
export class LLMInfoProvider {
  /**
   * Get a human-readable description of the models being used by a given LLM provider.
   */
  getModelsUsedDescription(
    llmProvider: LLMProvider,
    completionCandidates: LLMCandidateFunction[],
  ): string {
    const models = llmProvider.getModelsNames();
    const candidateDescriptions = completionCandidates
      .map((candidate) => {
        const modelId =
          candidate.modelQuality === LLMModelQuality.PRIMARY
            ? models.primaryCompletion
            : (models.secondaryCompletion ?? "n/a");
        return `${candidate.modelQuality}: ${modelId}`;
      })
      .join(", ");
    return `${llmProvider.getModelFamily()} (embeddings: ${models.embeddings}, completions - ${candidateDescriptions})`;
  }
}
