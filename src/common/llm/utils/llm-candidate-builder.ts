import { z } from "zod";
import type {
  LLMCandidateFunction,
  LLMFunction,
  BoundLLMFunction,
  ExecutableCandidate,
  EmbeddingCandidate,
} from "../types/llm-function.types";
import type { ProviderManager } from "../provider-manager";
import type { ResolvedModelChain } from "../types/llm-model.types";
import type { LLMExecutionContext, LLMCompletionOptions } from "../types/llm-request.types";
import type { LLMFunctionResponse } from "../types/llm-response.types";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";

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
    const boundFunc = async (content: string, context: LLMExecutionContext) => {
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
 * Builds unified executable candidates from completion candidates with options bound.
 * Returns a single array containing both the executable function and metadata,
 * eliminating index-correlation issues between separate arrays.
 *
 * @param completionCandidates The completion candidates from the chain
 * @param options The completion options to bind to each function
 * @param indexOverride Optional index to start from a specific candidate (slices from this index)
 * @returns Array of unified executable candidates
 */
export function buildExecutableCandidates<S extends z.ZodType<unknown>>(
  completionCandidates: LLMCandidateFunction[],
  options: LLMCompletionOptions<S>,
  indexOverride: number | null = null,
): ExecutableCandidate<z.infer<S>>[] {
  const startIndex = indexOverride ?? 0;

  if (completionCandidates.length === 0) {
    throw new LLMError(LLMErrorCode.BAD_CONFIGURATION, "No completion candidates available");
  }

  if (startIndex < 0 || startIndex >= completionCandidates.length) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Invalid completion candidate index: ${startIndex}. ` +
        `Available indices: 0-${completionCandidates.length - 1}`,
    );
  }

  const candidatesToUse = completionCandidates.slice(startIndex);

  return candidatesToUse.map((candidate, index) => {
    const boundFn: BoundLLMFunction<z.infer<S>> = async (
      content: string,
      ctx: LLMExecutionContext,
    ): Promise<LLMFunctionResponse<z.infer<S>>> => candidate.func(content, ctx, options);

    // Add debug name for better stack traces
    Object.defineProperty(boundFn, "name", { value: `boundCompletion_${startIndex + index}` });

    return {
      execute: boundFn,
      providerFamily: candidate.providerFamily,
      modelKey: candidate.modelKey,
      description: candidate.description,
    };
  });
}

/**
 * Builds unified executable candidates for embeddings from embedding candidates.
 * Returns a single array containing both the executable function and metadata.
 *
 * @param embeddingCandidates The embedding candidates from buildEmbeddingCandidatesFromChain
 * @param indexOverride Optional index to start from a specific candidate (slices from this index)
 * @returns Array of unified executable candidates for embeddings
 */
export function buildExecutableEmbeddingCandidates(
  embeddingCandidates: EmbeddingCandidate[],
  indexOverride: number | null = null,
): ExecutableCandidate<number[]>[] {
  const startIndex = indexOverride ?? 0;

  if (embeddingCandidates.length === 0) {
    throw new LLMError(LLMErrorCode.BAD_CONFIGURATION, "No embedding candidates available");
  }

  if (startIndex < 0 || startIndex >= embeddingCandidates.length) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Invalid embedding candidate index: ${startIndex}. ` +
        `Available indices: 0-${embeddingCandidates.length - 1}`,
    );
  }

  const candidatesToUse = embeddingCandidates.slice(startIndex);

  return candidatesToUse.map((candidate, index) => {
    const boundFn: BoundLLMFunction<number[]> = async (
      content: string,
      ctx: LLMExecutionContext,
    ): Promise<LLMFunctionResponse<number[]>> => candidate.func(content, ctx);

    // Add debug name for better stack traces
    Object.defineProperty(boundFn, "name", { value: `boundEmbedding_${startIndex + index}` });

    return {
      execute: boundFn,
      providerFamily: candidate.providerFamily,
      modelKey: candidate.modelKey,
      description: `${candidate.providerFamily}/${candidate.modelKey}`,
    };
  });
}
