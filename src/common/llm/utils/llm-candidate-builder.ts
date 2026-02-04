import { z } from "zod";
import type { BoundLLMFunction, ExecutableCandidate } from "../types/llm-function.types";
import type { ProviderManager } from "../provider-manager";
import type { ResolvedModelChain } from "../types/llm-model.types";
import type { LLMExecutionContext, LLMCompletionOptions } from "../types/llm-request.types";
import type { LLMFunctionResponse } from "../types/llm-response.types";
import { LLMError, LLMErrorCode } from "../types/llm-errors.types";

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
  const startIndex = indexOverride ?? 0;
  const completions = modelChain.completions;

  if (completions.length === 0) {
    throw new LLMError(LLMErrorCode.BAD_CONFIGURATION, "No completion models configured");
  }

  if (startIndex < 0 || startIndex >= completions.length) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Invalid completion model index: ${startIndex}. ` +
        `Available indices: 0-${completions.length - 1}`,
    );
  }

  const modelsToUse = completions.slice(startIndex);

  return modelsToUse.map((entry, index) => {
    const provider = providerManager.getProvider(entry.providerFamily);

    // Create a bound function that routes to the correct provider and model with options applied
    const boundFn: BoundLLMFunction<z.infer<S>> = async (
      content: string,
      ctx: LLMExecutionContext,
    ): Promise<LLMFunctionResponse<z.infer<S>>> => {
      return provider.executeCompletion(entry.modelKey, content, ctx, options);
    };

    // Add debug name for better stack traces
    Object.defineProperty(boundFn, "name", { value: `boundCompletion_${startIndex + index}` });

    return {
      execute: boundFn,
      providerFamily: entry.providerFamily,
      modelKey: entry.modelKey,
      description: `${entry.providerFamily}/${entry.modelKey}`,
    };
  });
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
  const startIndex = indexOverride ?? 0;
  const embeddings = modelChain.embeddings;

  if (embeddings.length === 0) {
    throw new LLMError(LLMErrorCode.BAD_CONFIGURATION, "No embedding models configured");
  }

  if (startIndex < 0 || startIndex >= embeddings.length) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Invalid embedding model index: ${startIndex}. ` +
        `Available indices: 0-${embeddings.length - 1}`,
    );
  }

  const modelsToUse = embeddings.slice(startIndex);

  return modelsToUse.map((entry, index) => {
    const provider = providerManager.getProvider(entry.providerFamily);

    // Create a bound function that routes to the correct provider and model
    const boundFn: BoundLLMFunction<number[]> = async (
      content: string,
      ctx: LLMExecutionContext,
    ): Promise<LLMFunctionResponse<number[]>> => {
      return provider.generateEmbeddings(entry.modelKey, content, ctx);
    };

    // Add debug name for better stack traces
    Object.defineProperty(boundFn, "name", { value: `boundEmbedding_${startIndex + index}` });

    return {
      execute: boundFn,
      providerFamily: entry.providerFamily,
      modelKey: entry.modelKey,
      description: `${entry.providerFamily}/${entry.modelKey}`,
    };
  });
}
