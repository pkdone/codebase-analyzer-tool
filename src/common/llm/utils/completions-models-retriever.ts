import { z } from "zod";
import type {
  LLMCandidateFunction,
  LLMFunction,
  BoundLLMFunction,
} from "../types/llm-function.types";
import type { ProviderManager } from "../provider-manager";
import type { ResolvedModelChain } from "../types/llm-model.types";
import type { LLMContext, LLMCompletionOptions } from "../types/llm-request.types";
import type { LLMFunctionResponse } from "../types/llm-response.types";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";

/**
 * Embedding candidate function type.
 */
interface EmbeddingCandidate {
  func: (content: string, context: LLMContext) => Promise<LLMFunctionResponse<number[]>>;
  providerFamily: string;
  modelKey: string;
  priority: number;
}

/**
 * Build completion candidates from the model chain configuration.
 * Creates bound functions that route to the correct provider based on the chain entry.
 *
 * @param providerManager The provider manager for accessing provider instances
 * @param modelChain The resolved model chain configuration
 * @returns Array of completion candidate functions in priority order
 */
export function buildCompletionCandidatesFromChain(
  providerManager: ProviderManager,
  modelChain: ResolvedModelChain,
): LLMCandidateFunction[] {
  const candidates: LLMCandidateFunction[] = [];

  for (let i = 0; i < modelChain.completions.length; i++) {
    const entry = modelChain.completions[i];
    const provider = providerManager.getProvider(entry.providerFamily);

    // Create a bound function that routes to the correct provider and model
    const boundFunc: LLMFunction = async (content, context, options) => {
      return provider.executeCompletion(entry.modelKey, content, context, options);
    };

    candidates.push({
      func: boundFunc,
      providerFamily: entry.providerFamily,
      modelKey: entry.modelKey,
      description: `${entry.providerFamily}/${entry.modelKey}`,
      priority: i,
    });
  }

  return candidates;
}

/**
 * Build embedding candidates from the model chain configuration.
 * Creates bound functions that route to the correct provider based on the chain entry.
 *
 * @param providerManager The provider manager for accessing provider instances
 * @param modelChain The resolved model chain configuration
 * @returns Array of embedding functions in priority order
 */
export function buildEmbeddingCandidatesFromChain(
  providerManager: ProviderManager,
  modelChain: ResolvedModelChain,
): EmbeddingCandidate[] {
  const candidates: EmbeddingCandidate[] = [];

  for (let i = 0; i < modelChain.embeddings.length; i++) {
    const entry = modelChain.embeddings[i];
    const provider = providerManager.getProvider(entry.providerFamily);

    // Create a bound function that routes to the correct provider and model
    const boundFunc = async (content: string, context: LLMContext) => {
      return provider.generateEmbeddings(entry.modelKey, content, context);
    };

    candidates.push({
      func: boundFunc,
      providerFamily: entry.providerFamily,
      modelKey: entry.modelKey,
      priority: i,
    });
  }

  return candidates;
}

/**
 * Get completion candidates optionally filtered by a specific index.
 * If indexOverride is provided, returns only that candidate.
 * Otherwise returns all candidates.
 *
 * @param completionCandidates The full list of completion candidates
 * @param indexOverride Optional index to filter to a specific candidate
 * @returns Object containing the candidates to use and their functions
 */
export function getFilteredCompletionCandidates(
  completionCandidates: LLMCandidateFunction[],
  indexOverride: number | null = null,
): {
  candidatesToUse: LLMCandidateFunction[];
  candidateFunctions: LLMFunction[];
} {
  let candidatesToUse: LLMCandidateFunction[];

  if (indexOverride !== null) {
    if (indexOverride < 0 || indexOverride >= completionCandidates.length) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        `Invalid completion candidate index: ${indexOverride}. ` +
          `Available indices: 0-${completionCandidates.length - 1}`,
      );
    }
    candidatesToUse = [completionCandidates[indexOverride]];
  } else {
    candidatesToUse = completionCandidates;
  }

  if (candidatesToUse.length === 0) {
    throw new LLMError(LLMErrorCode.BAD_CONFIGURATION, "No completion candidates available");
  }

  const candidateFunctions: LLMFunction[] = candidatesToUse.map((candidate) => candidate.func);
  return { candidatesToUse, candidateFunctions };
}

/**
 * Binds completion options to an array of LLM functions, creating named bound functions
 * for better stack traces and debugging.
 *
 * This helper extracts the anonymous closure logic from LLMRouter.executeCompletion,
 * giving each bound function a descriptive name that includes its index in the chain.
 *
 * @param candidateFunctions Array of LLM functions to bind options to
 * @param options The completion options to bind to each function
 * @returns Array of bound functions with debug-friendly names
 */
export function bindCompletionFunctions<S extends z.ZodType>(
  candidateFunctions: LLMFunction[],
  options: LLMCompletionOptions<S>,
): BoundLLMFunction<z.infer<S>>[] {
  return candidateFunctions.map((fn, index) => {
    const boundFn: BoundLLMFunction<z.infer<S>> = async (
      content: string,
      ctx: LLMContext,
    ): Promise<LLMFunctionResponse<z.infer<S>>> => fn(content, ctx, options);
    // Add debug name for better stack traces
    Object.defineProperty(boundFn, "name", { value: `boundCompletion_${index}` });
    return boundFn;
  });
}
