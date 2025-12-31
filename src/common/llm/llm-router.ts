import { z } from "zod";
import {
  LLMContext,
  LLMModelQuality,
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMCompletionOptions,
  BoundLLMFunction,
  ShutdownBehavior,
  LLMGeneratedContent,
} from "./types/llm.types";
import type { LLMProvider, LLMCandidateFunction } from "./types/llm.types";
import { LLMError, LLMErrorCode } from "./types/llm-errors.types";
import { type Result, ok, err } from "../types/result.types";
import type {
  LLMRetryConfig,
  LLMProviderManifest,
  ProviderInit,
} from "./providers/llm-provider.types";
import { LLMModuleConfig } from "./config/llm-module-config.types";
import { LLMExecutionPipeline } from "./llm-execution-pipeline";
import {
  getOverriddenCompletionCandidates,
  buildCompletionCandidates,
} from "./utils/completions-models-retriever";
import { loadManifestForModelFamily } from "./utils/manifest-loader";
import { logOneLineWarning } from "../utils/logging";
import { LLMErrorLogger } from "./tracking/llm-error-logger";

/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization /
 * completion function:
 *
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
export default class LLMRouter {
  // Private fields
  private readonly activeLlmProvider: LLMProvider;
  private readonly modelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  private readonly completionCandidates: LLMCandidateFunction[];
  private readonly providerRetryConfig: LLMRetryConfig;
  private readonly manifest: LLMProviderManifest;
  private readonly modelFamily: string;

  /**
   * Constructor.
   *
   * @param config The LLM module configuration
   * @param executionPipeline The execution pipeline for orchestrating LLM calls
   * @param errorLogger The error logger service for recording JSON processing errors
   */
  constructor(
    config: LLMModuleConfig,
    private readonly executionPipeline: LLMExecutionPipeline,
    private readonly errorLogger: LLMErrorLogger,
  ) {
    this.modelFamily = config.modelFamily;
    // Load manifest for the model family
    this.manifest = loadManifestForModelFamily(this.modelFamily);
    console.log(
      `LLMRouter: Loaded provider for model family '${this.modelFamily}': ${this.manifest.providerName}`,
    );

    // Create LLM provider instance using ProviderInit pattern
    const init: ProviderInit = {
      manifest: this.manifest,
      providerParams: config.providerParams,
      resolvedModels: config.resolvedModels,
      errorLogger: this.errorLogger,
    };
    this.activeLlmProvider = new this.manifest.implementation(init);

    this.modelsMetadata = this.activeLlmProvider.getModelsMetadata();
    this.providerRetryConfig = this.manifest.providerSpecificConfig;
    this.completionCandidates = buildCompletionCandidates(this.activeLlmProvider);

    if (this.completionCandidates.length === 0) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "At least one completion candidate function must be provided",
      );
    }

    console.log(`Router LLMs to be used: ${this.getModelsUsedDescription()}`);
  }

  /**
   * Get the shutdown behavior required by the underlying provider.
   * Returns an enum value indicating how the provider should be shut down.
   */
  getProviderShutdownBehavior(): ShutdownBehavior {
    return this.activeLlmProvider.getShutdownBehavior();
  }

  /**
   * Shutdown method for graceful shutdown.
   * Closes the LLM provider.
   *
   * Note: After calling shutdown(), consumers should check `getProviderShutdownBehavior()`
   * and handle forced process termination if needed. This allows the consuming application
   * to control process lifecycle rather than having the library terminate the process.
   *
   * Example:
   * ```typescript
   * await llmRouter.shutdown();
   * if (llmRouter.getProviderShutdownBehavior() === ShutdownBehavior.REQUIRES_PROCESS_EXIT) {
   *   // Handle forced termination (e.g., call process.exit(0))
   * }
   * ```
   */
  async shutdown(): Promise<void> {
    await this.activeLlmProvider.close();
  }

  /**
   * Get the model family of the LLM implementation.
   */
  getModelFamily(): string {
    return this.activeLlmProvider.getModelFamily();
  }

  /**
   * Get a human-readable description of the models being used by the LLM provider.
   */
  getModelsUsedDescription(): string {
    const models = this.activeLlmProvider.getModelsNames();
    const modelNames = [
      models.embeddings,
      models.primaryCompletion,
      models.secondaryCompletion,
    ].filter((name): name is string => name !== undefined);
    return `${this.activeLlmProvider.getModelFamily()} (${modelNames.join(", ")})`;
  }

  /**
   * Get the dimensions for the embeddings model.
   */
  getEmbeddingModelDimensions(): number | undefined {
    return this.activeLlmProvider.getEmbeddingModelDimensions();
  }

  /**
   * Get the loaded provider manifest.
   * Note: The manifest contains functions and cannot be deep cloned with structuredClone.
   */
  getLLMManifest(): LLMProviderManifest {
    return this.manifest;
  }

  /**
   * Send the content to the LLM for it to generate and return the content's embedding.
   *
   * Uses the unified execution pipeline which provides:
   * - Retry logic for overloaded models
   * - Prompt cropping when content exceeds context window
   * - Statistics tracking (success, failure, retries, crops)
   * - Consistent error handling and logging
   *
   * Embeddings use the same pipeline as completions but with a single-element function array
   * (no model fallback) and retryOnInvalid=false (no JSON parsing for embeddings).
   */
  async generateEmbeddings(resourceName: string, content: string): Promise<number[] | null> {
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.EMBEDDINGS,
    };

    // Embedding function is already compatible with BoundLLMFunction<number[]>
    const embeddingFn: BoundLLMFunction<number[]> = async (c: string, ctx: LLMContext) =>
      this.activeLlmProvider.generateEmbeddings(c, ctx);

    const result = await this.executionPipeline.execute<number[]>({
      resourceName,
      content,
      context,
      llmFunctions: [embeddingFn],
      providerRetryConfig: this.providerRetryConfig,
      modelsMetadata: this.modelsMetadata,
      retryOnInvalid: false, // Embeddings don't have JSON parsing
      trackJsonMutations: false, // No JSON mutations for embeddings
    });

    if (!result.success) {
      // Error already logged by the execution pipeline
      return null;
    }

    // Validate that the result is actually an array of numbers (embeddings)
    if (!Array.isArray(result.data)) {
      logOneLineWarning(
        `Embedding response has invalid type: expected number[] but got ${typeof result.data}`,
        context,
      );
      return null;
    }

    return result.data;
  }

  /**
   * Send the prompt to the LLM for and retrieve the LLM's answer.
   *
   * When options.jsonSchema is provided, this method will:
   * - Use native JSON mode capabilities where available
   * - Fall back to text parsing for providers that don't support structured output
   * - Validate the response against the provided Zod schema
   * - Return the validated, typed result (inferred from the schema)
   *
   * If a particular LLM quality is not specified, will try to use the completion candidates
   * in the order they were configured during construction.
   *
   * The return type is a Result discriminated union that forces explicit error handling:
   * - When jsonSchema is provided, returns Result<z.infer<typeof schema>, LLMError>
   * - When jsonSchema is not provided (TEXT mode), returns Result<string, LLMError>
   *
   * Function overloads provide compile-time type safety based on output format.
   */
  // Overload for JSON with a specific schema
  async executeCompletion<S extends z.ZodType>(
    resourceName: string,
    prompt: string,
    options: LLMCompletionOptions<S> & { jsonSchema: S },
    modelQualityOverride?: LLMModelQuality | null,
  ): Promise<Result<z.infer<S>, LLMError>>;

  // Overload for plain TEXT (without jsonSchema)
  async executeCompletion(
    resourceName: string,
    prompt: string,
    options: Omit<LLMCompletionOptions, "jsonSchema">,
    modelQualityOverride?: LLMModelQuality | null,
  ): Promise<Result<string, LLMError>>;

  // Implementation signature uses LLMGeneratedContent to cover all possible return types.
  // Type safety for callers is enforced by the overload signatures above.
  async executeCompletion<S extends z.ZodType>(
    resourceName: string,
    prompt: string,
    options: LLMCompletionOptions<S>,
    modelQualityOverride: LLMModelQuality | null = null,
  ): Promise<Result<LLMGeneratedContent, LLMError>> {
    const { candidatesToUse, candidateFunctions } = getOverriddenCompletionCandidates(
      this.completionCandidates,
      modelQualityOverride,
    );
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.COMPLETIONS,
      modelQuality: candidatesToUse[0].modelQuality,
      outputFormat: options.outputFormat,
    };

    // Bind options to create BoundLLMFunction<z.infer<S>>[] for the unified pipeline
    const boundFunctions: BoundLLMFunction<z.infer<S>>[] = candidateFunctions.map(
      (fn) => async (content: string, ctx: LLMContext) => fn(content, ctx, options),
    );

    const result = await this.executionPipeline.execute<z.infer<S>>({
      resourceName,
      content: prompt,
      context,
      llmFunctions: boundFunctions,
      providerRetryConfig: this.providerRetryConfig,
      modelsMetadata: this.modelsMetadata,
      candidateModels: candidatesToUse,
      retryOnInvalid: true,
      trackJsonMutations: true,
    });

    if (!result.success) {
      logOneLineWarning(`Failed to execute completion: ${result.error.message}`, context);
      return err(
        new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, result.error.message, {
          resourceName,
          context,
        }),
      );
    }

    // Type safety is enforced by the function overloads at the call site.
    // The implementation returns the concrete data, and overloads provide correct types to callers.
    return ok(result.data as LLMGeneratedContent);
  }
}
