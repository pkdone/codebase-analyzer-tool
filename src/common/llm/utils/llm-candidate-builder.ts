import { z } from "zod";
import type { BoundLLMFunction, ExecutableCandidate } from "../types/llm-function.types";
import type { ProviderManager } from "../provider-manager";
import type { ModelChainEntry, ResolvedModelChain } from "../types/llm-model.types";
import type { LLMExecutionContext, LLMCompletionOptions } from "../types/llm-request.types";
import type { LLMFunctionResponse } from "../types/llm-response.types";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";

/**
 * Creates a bound function from a model chain entry.
 * @template T - The response data type
 */
type BoundFunctionCreator<T> = (
  provider: ReturnType<ProviderManager["getProvider"]>,
  entry: ModelChainEntry,
) => BoundLLMFunction<T>;

/**
 * Generic builder for executable candidates from a model chain.
 * Handles validation, slicing, and mapping - the common pattern shared by
 * both completion and embedding builders.
 *
 * @param providerManager The provider manager for accessing provider instances
 * @param chainEntries The model chain entries (completions or embeddings)
 * @param createBoundFn Factory function to create the bound execution function
 * @param labelPrefix Prefix for debug function names (e.g., "boundCompletion", "boundEmbedding")
 * @param chainType Human-readable chain type for error messages (e.g., "completion", "embedding")
 * @param indexOverride Optional index to start from (slices from this index)
 * @returns Array of executable candidates ready for the pipeline
 */
function buildExecutables<T>(
  providerManager: ProviderManager,
  chainEntries: readonly ModelChainEntry[],
  createBoundFn: BoundFunctionCreator<T>,
  labelPrefix: string,
  chainType: string,
  indexOverride: number | null,
): ExecutableCandidate<T>[] {
  const startIndex = indexOverride ?? 0;

  if (chainEntries.length === 0) {
    throw new LLMError(LLMErrorCode.BAD_CONFIGURATION, `No ${chainType} models configured`);
  }

  if (startIndex < 0 || startIndex >= chainEntries.length) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Invalid ${chainType} model index: ${startIndex}. ` +
        `Available indices: 0-${chainEntries.length - 1}`,
    );
  }

  const modelsToUse = chainEntries.slice(startIndex);

  return modelsToUse.map((entry, index) => {
    const provider = providerManager.getProvider(entry.providerFamily);
    const boundFn = createBoundFn(provider, entry);

    // Add debug name for better stack traces
    Object.defineProperty(boundFn, "name", { value: `${labelPrefix}_${startIndex + index}` });

    return {
      execute: boundFn,
      providerFamily: entry.providerFamily,
      modelKey: entry.modelKey,
      description: `${entry.providerFamily}/${entry.modelKey}`,
    };
  });
}

/**
 * Builds executable completion candidates directly from the model chain configuration.
 * Creates bound functions that route to the correct provider and model with options already applied.
 *
 * This is the single-step builder that eliminates the need for intermediate candidate types.
 *
 * @param providerManager The provider manager for accessing provider instances
 * @param modelChain The resolved model chain configuration
 * @param options The completion options to bind to each function
 * @param indexOverride Optional index to start from a specific candidate (slices from this index)
 * @returns Array of executable candidates ready for the pipeline
 */
export function buildCompletionExecutables<S extends z.ZodType<unknown>>(
  providerManager: ProviderManager,
  modelChain: ResolvedModelChain,
  options: LLMCompletionOptions<S>,
  indexOverride: number | null = null,
): ExecutableCandidate<z.infer<S>>[] {
  return buildExecutables<z.infer<S>>(
    providerManager,
    modelChain.completions,
    (provider, entry): BoundLLMFunction<z.infer<S>> =>
      async (content: string, ctx: LLMExecutionContext): Promise<LLMFunctionResponse<z.infer<S>>> =>
        provider.executeCompletion(entry.modelKey, content, ctx, options),
    "boundCompletion",
    "completion",
    indexOverride,
  );
}

/**
 * Builds executable embedding candidates directly from the model chain configuration.
 * Creates bound functions that route to the correct provider and model.
 *
 * This is the single-step builder that eliminates the need for intermediate candidate types.
 *
 * @param providerManager The provider manager for accessing provider instances
 * @param modelChain The resolved model chain configuration
 * @param indexOverride Optional index to start from a specific candidate (slices from this index)
 * @returns Array of executable candidates ready for the pipeline
 */
export function buildEmbeddingExecutables(
  providerManager: ProviderManager,
  modelChain: ResolvedModelChain,
  indexOverride: number | null = null,
): ExecutableCandidate<number[]>[] {
  return buildExecutables<number[]>(
    providerManager,
    modelChain.embeddings,
    (provider, entry): BoundLLMFunction<number[]> =>
      async (content: string, ctx: LLMExecutionContext): Promise<LLMFunctionResponse<number[]>> =>
        provider.generateEmbeddings(entry.modelKey, content, ctx),
    "boundEmbedding",
    "embedding",
    indexOverride,
  );
}
