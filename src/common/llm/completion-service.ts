import { z } from "zod";
import type { LLMContext, LLMCompletionOptions } from "./types/llm-request.types";
import { LLMPurpose } from "./types/llm-request.types";
import type { ResolvedModelChain } from "./types/llm-model.types";
import type { LLMCandidateFunction, ExecutableCandidate } from "./types/llm-function.types";
import type { LLMGeneratedContent } from "./types/llm-response.types";
import { LLMError, LLMErrorCode } from "./types/llm-errors.types";
import { type Result, ok, err } from "../types/result.types";
import type { LLMExecutionPipeline } from "./llm-execution-pipeline";
import type { ProviderManager } from "./provider-manager";
import { buildExecutableCandidates } from "./utils/llm-candidate-builder";
import { logWarn } from "../utils/logging";
import { llmConfig } from "./config/llm.config";

/**
 * Dependencies required by the CompletionService.
 * Uses constructor injection to avoid tsyringe in common/ folder.
 */
export interface CompletionServiceDependencies {
  /** Pre-built completion candidates from the model chain */
  readonly completionCandidates: LLMCandidateFunction[];
  /** The resolved model chain configuration */
  readonly modelChain: ResolvedModelChain;
  /** Provider manager for model metadata access */
  readonly providerManager: ProviderManager;
  /** Shared execution pipeline for retries, cropping, and stats */
  readonly executionPipeline: LLMExecutionPipeline;
}

/**
 * Service dedicated to completion operations.
 *
 * This service encapsulates completion-specific logic, creating architectural
 * symmetry with EmbeddingService. Key responsibilities include:
 * - Executing completions through the execution pipeline
 * - Providing completion model metadata (max tokens, chain info)
 *
 * Features inherited from the execution pipeline:
 * - Retry logic for overloaded models
 * - Prompt cropping when content exceeds context window
 * - Statistics tracking (success, failure, retries, crops)
 * - Fallback to next completion model if configured
 *
 * Note: This class intentionally does NOT use tsyringe or any DI framework
 * since it resides in src/common/ which must remain portable.
 */
export class CompletionService {
  private readonly completionCandidates: LLMCandidateFunction[];
  private readonly modelChain: ResolvedModelChain;
  private readonly providerManager: ProviderManager;
  private readonly executionPipeline: LLMExecutionPipeline;

  /**
   * Constructor with manual dependency injection.
   *
   * @param deps Dependencies required for completion operations
   */
  constructor(deps: CompletionServiceDependencies) {
    this.completionCandidates = deps.completionCandidates;
    this.modelChain = deps.modelChain;
    this.providerManager = deps.providerManager;
    this.executionPipeline = deps.executionPipeline;
  }

  /**
   * Execute a completion request through the LLM pipeline.
   *
   * Uses the execution pipeline which provides:
   * - Retry logic for overloaded models
   * - Prompt cropping when content exceeds context window
   * - Statistics tracking (success, failure, retries, crops)
   * - Consistent error handling and logging
   * - Fallback to next completion model if configured
   *
   * @param resourceName Name of the resource being processed
   * @param prompt The prompt to send to the LLM
   * @param options Completion options including output format and optional schema
   * @param modelIndexOverride Optional index to start from a specific model in the chain
   * @returns Result with the completion response or an LLMError
   */
  async executeCompletion<S extends z.ZodType<unknown>>(
    resourceName: string,
    prompt: string,
    options: LLMCompletionOptions<S>,
    modelIndexOverride: number | null = null,
  ): Promise<Result<z.infer<S>, LLMError>> {
    // Build unified executable candidates with options bound
    const candidates = buildExecutableCandidates(
      this.completionCandidates,
      options,
      modelIndexOverride,
    );

    const firstCandidate = candidates[0];
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.COMPLETIONS,
      modelKey: firstCandidate.modelKey,
      outputFormat: options.outputFormat,
    };

    // Type assertion is safe here: when a schema is provided, z.infer<S> produces
    // an object type that satisfies LLMGeneratedContent. When no schema is provided,
    // the response handling in BaseLLMProvider ensures the data is LLMGeneratedContent.
    // The pipeline's T extends LLMGeneratedContent constraint ensures internal type safety,
    // while this assertion bridges the wider z.ZodType<unknown> constraint used at the API level.
    type InferredType = z.infer<S> extends LLMGeneratedContent ? z.infer<S> : LLMGeneratedContent;
    const result = await this.executionPipeline.execute<InferredType>({
      resourceName,
      content: prompt,
      context,
      candidates: candidates as ExecutableCandidate<InferredType>[],
      retryOnInvalid: true,
      trackJsonMutations: true,
    });

    if (!result.success) {
      logWarn(`Failed to execute completion: ${result.error.message}`, context);
      return err(
        new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, result.error.message, {
          resourceName,
          context,
        }),
      );
    }

    return ok(result.data);
  }

  /**
   * Get the configured completion model chain.
   * Useful for iterating through models for testing or display purposes.
   */
  getCompletionChain(): ResolvedModelChain["completions"] {
    return this.modelChain.completions;
  }

  /**
   * Get the max total tokens for the first completion model in the chain.
   * Useful for chunking calculations.
   */
  getFirstCompletionModelMaxTokens(): number {
    if (this.completionCandidates.length === 0) return llmConfig.DEFAULT_MAX_TOKENS_FALLBACK;
    const firstEntry = this.modelChain.completions[0];
    const metadata = this.providerManager.getModelMetadata(
      firstEntry.providerFamily,
      firstEntry.modelKey,
    );
    return metadata?.maxTotalTokens ?? llmConfig.DEFAULT_MAX_TOKENS_FALLBACK;
  }

  /**
   * Check if the service has any completion candidates configured.
   */
  hasCompletionCandidates(): boolean {
    return this.completionCandidates.length > 0;
  }
}
