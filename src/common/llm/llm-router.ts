import { z } from "zod";
import {
  LLMContext,
  LLMModelQuality,
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMCompletionOptions,
  LLMEmbeddingFunction,
} from "./types/llm.types";
import type { LLMProvider, LLMCandidateFunction } from "./types/llm.types";
import { LLMError, LLMErrorCode } from "./types/llm-errors.types";
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
  private readonly llm: LLMProvider;
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
    this.llm = new this.manifest.implementation(init);

    this.modelsMetadata = this.llm.getModelsMetadata();
    this.providerRetryConfig = this.manifest.providerSpecificConfig;
    this.completionCandidates = buildCompletionCandidates(this.llm);

    if (this.completionCandidates.length === 0) {
      throw new LLMError(
        LLMErrorCode.BAD_CONFIGURATION,
        "At least one completion candidate function must be provided",
      );
    }

    console.log(`Router LLMs to be used: ${this.getModelsUsedDescription()}`);
  }

  /**
   * Check if the underlying provider needs a forced shutdown.
   */
  providerNeedsForcedShutdown(): boolean {
    return this.llm.needsForcedShutdown();
  }

  /**
   * Shutdown method for graceful shutdown.
   * Closes the LLM provider.
   *
   * Note: After calling shutdown(), consumers should check `providerNeedsForcedShutdown()`
   * and handle forced process termination if needed. This allows the consuming application
   * to control process lifecycle rather than having the library terminate the process.
   *
   * Example:
   * ```typescript
   * await llmRouter.shutdown();
   * if (llmRouter.providerNeedsForcedShutdown()) {
   *   // Handle forced termination (e.g., call process.exit(0))
   * }
   * ```
   */
  async shutdown(): Promise<void> {
    await this.llm.close();
  }

  /**
   * Get the model family of the LLM implementation.
   */
  getModelFamily(): string {
    return this.llm.getModelFamily();
  }

  /**
   * Get a human-readable description of the models being used by the LLM provider.
   */
  getModelsUsedDescription(): string {
    const models = this.llm.getModelsNames();
    const candidateDescriptions = this.completionCandidates
      .map((candidate) => {
        const modelId =
          candidate.modelQuality === LLMModelQuality.PRIMARY
            ? models.primaryCompletion
            : (models.secondaryCompletion ?? "n/a");
        return `${candidate.modelQuality}: ${modelId}`;
      })
      .join(", ");
    return `${this.llm.getModelFamily()} (embeddings: ${models.embeddings}, completions - ${candidateDescriptions})`;
  }

  /**
   * Get the dimensions for the embeddings model.
   */
  getEmbeddingModelDimensions(): number | undefined {
    return this.llm.getEmbeddingModelDimensions();
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
   * Note: Embeddings use a separate function type (LLMEmbeddingFunction) that always returns
   * number[], so we don't use the schema-based type inference here.
   */
  async generateEmbeddings(resourceName: string, content: string): Promise<number[] | null> {
    const context: LLMContext = {
      resource: resourceName,
      purpose: LLMPurpose.EMBEDDINGS,
    };
    // Cast embedding function to LLMFunction for pipeline compatibility.
    // This is safe because embeddings don't use schema-based inference and always return number[].
    const embeddingFn = this.llm.generateEmbeddings.bind(
      this.llm,
    ) as unknown as LLMEmbeddingFunction;
    const contentResponse = await embeddingFn(content, context);

    if (contentResponse.status !== "completed") {
      logOneLineWarning(`Failed to generate embeddings: ${contentResponse.status}`, context);
      return null;
    }

    if (
      !(
        Array.isArray(contentResponse.generated) &&
        contentResponse.generated.every((item: unknown) => typeof item === "number")
      )
    ) {
      logOneLineWarning("LLM response for embeddings was not an array of numbers", context);
      return null;
    }

    return contentResponse.generated;
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
   * The return type is automatically inferred from the options parameter:
   * - When jsonSchema is provided, returns z.infer<typeof schema> | null
   * - When jsonSchema is not provided (TEXT mode), returns string | null
   *
   * Function overloads provide compile-time type safety based on output format.
   */
  // Overload for JSON with a specific schema
  async executeCompletion<S extends z.ZodType>(
    resourceName: string,
    prompt: string,
    options: LLMCompletionOptions<S> & { jsonSchema: S },
    modelQualityOverride?: LLMModelQuality | null,
  ): Promise<z.infer<S> | null>;

  // Overload for plain TEXT (without jsonSchema)
  async executeCompletion(
    resourceName: string,
    prompt: string,
    options: Omit<LLMCompletionOptions, "jsonSchema">,
    modelQualityOverride?: LLMModelQuality | null,
  ): Promise<string | null>;

  // Implementation with a union return type
  async executeCompletion<S extends z.ZodType>(
    resourceName: string,
    prompt: string,
    options: LLMCompletionOptions<S>,
    modelQualityOverride: LLMModelQuality | null = null,
  ): Promise<z.infer<S> | string | null> {
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

    const result = await this.executionPipeline.execute<S>({
      resourceName,
      prompt,
      context,
      llmFunctions: candidateFunctions,
      providerRetryConfig: this.providerRetryConfig,
      modelsMetadata: this.modelsMetadata,
      candidateModels: candidatesToUse,
      completionOptions: options,
    });

    if (!result.success) {
      logOneLineWarning(`Failed to execute completion: ${result.error.message}`, context);
      return null;
    }

    // With improved type flow, result.data is now InferResponseType<LLMCompletionOptions<S>>.
    // The overloads ensure compile-time type safety for callers.
    // This cast is necessary for TypeScript's overload implementation but is safe due to runtime validation.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
    return result.data as any;
  }
}
