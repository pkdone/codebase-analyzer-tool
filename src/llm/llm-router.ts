import { injectable, inject } from "tsyringe";
import {
  LLMContext,
  LLMModelQuality,
  LLMPurpose,
  ResolvedLLMModelMetadata,
  LLMCompletionOptions,
  LLMModelMetadata,
  LLMModelKeysSet,
  LLMEmbeddingFunction,
  InferResponseType,
} from "./types/llm.types";
import type { LLMProvider, LLMCandidateFunction } from "./types/llm.types";
import { BadConfigurationLLMError } from "./types/llm-errors.types";
import type { LLMRetryConfig, LLMProviderManifest } from "./providers/llm-provider.types";
import type { EnvVars } from "../env/env.types";
import { llmTokens, coreTokens } from "../di/tokens";
import { LLMExecutionPipeline } from "./llm-execution-pipeline";
import {
  getOverriddenCompletionCandidates,
  buildCompletionCandidates,
} from "./utils/completions-models-retriever";
import { loadManifestForModelFamily } from "./utils/manifest-loader";
import { logOneLineWarning } from "../common/utils/logging";
import { isDefined } from "../common/utils/type-guards";
import { LLMErrorLogger } from "./tracking/llm-error-logger";

/**
 * Class for loading the required LLMs as specified by various environment settings and applying
 * the following non-functinal aspects before/after invoking a specific LLM vectorization /
 * completion function:
 *
 * See the `README` for the LLM non-functional behaviours abstraction / protection applied.
 */
@injectable()
export default class LLMRouter {
  // Private fields
  private readonly llm: LLMProvider;
  private readonly modelsMetadata: Record<string, ResolvedLLMModelMetadata>;
  private readonly completionCandidates: LLMCandidateFunction[];
  private readonly providerRetryConfig: LLMRetryConfig;
  private readonly manifest: LLMProviderManifest;

  /**
   * Constructor.
   *
   * @param modelFamily The LLM model family identifier
   * @param envVars Environment variables
   * @param executionPipeline The execution pipeline for orchestrating LLM calls
   * @param errorLogger The error logger service for recording JSON processing errors
   */
  constructor(
    @inject(llmTokens.LLMModelFamily) private readonly modelFamily: string,
    @inject(coreTokens.EnvVars) private readonly envVars: EnvVars,
    private readonly executionPipeline: LLMExecutionPipeline,
    @inject(llmTokens.LLMErrorLogger) private readonly errorLogger: LLMErrorLogger,
  ) {
    // Load manifest for the model family
    this.manifest = loadManifestForModelFamily(this.modelFamily);
    console.log(
      `LLMRouter: Loaded provider for model family '${this.modelFamily}': ${this.manifest.providerName}`,
    );

    // Create LLM provider instance
    const modelsKeysSet = this.buildModelsKeysSet(this.manifest);
    const modelsMetadata = this.buildModelsMetadata(this.manifest, this.envVars);
    const config = { providerSpecificConfig: this.manifest.providerSpecificConfig };
    this.llm = new this.manifest.implementation(
      this.envVars,
      modelsKeysSet,
      modelsMetadata,
      this.manifest.errorPatterns,
      config,
      this.manifest.modelFamily,
      this.errorLogger,
      this.manifest.features,
    );

    this.modelsMetadata = this.llm.getModelsMetadata();
    this.providerRetryConfig = this.manifest.providerSpecificConfig;
    this.completionCandidates = buildCompletionCandidates(this.llm);

    if (this.completionCandidates.length === 0) {
      throw new BadConfigurationLLMError(
        "At least one completion candidate function must be provided",
      );
    }

    console.log(`Router LLMs to be used: ${this.getModelsUsedDescription()}`);
  }

  /**
   * Call close on LLM implementation to release resources.
   */
  async close(): Promise<void> {
    await this.llm.close();
  }

  /**
   * Check if the underlying provider needs a forced shutdown.
   */
  providerNeedsForcedShutdown(): boolean {
    return this.llm.needsForcedShutdown();
  }

  /**
   * Shutdown method for graceful shutdown.
   * Closes the LLM provider and handles forced shutdown if needed.
   */
  async shutdown(): Promise<void> {
    await this.close();

    // Handle provider-specific forced shutdown requirements
    if (this.providerNeedsForcedShutdown()) {
      // Known Google Cloud Node.js client limitation:
      // VertexAI SDK doesn't have explicit close() method and HTTP connections may persist
      // This is documented behavior - see: https://github.com/googleapis/nodejs-pubsub/issues/1190
      // Use timeout-based cleanup as the recommended workaround
      void setTimeout(() => {
        console.log("Forced exit because GCP client connections cannot be closed properly");
        process.exit(0);
      }, 1000); // 1 second should be enough for any pending operations
    }
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
   * - When outputFormat is TEXT, returns string | null
   * - Otherwise returns LLMGeneratedContent | null
   */
  async executeCompletion<TOptions extends LLMCompletionOptions>(
    resourceName: string,
    prompt: string,
    options: TOptions,
    modelQualityOverride: LLMModelQuality | null = null,
  ): Promise<InferResponseType<TOptions> | null> {
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

    // The type now flows through the pipeline automatically via InferResponseType<TOptions>.
    // No local type helpers needed - the pipeline infers the return type from options.
    const result = await this.executionPipeline.execute(
      resourceName,
      prompt,
      context,
      candidateFunctions,
      this.providerRetryConfig,
      this.modelsMetadata,
      candidatesToUse,
      options,
    );

    if (!result.success) {
      logOneLineWarning(`Failed to execute completion: ${result.error.message}`, context);
      return null;
    }

    return result.data;
  }

  /**
   * Build LLMModelKeysSet from manifest
   */
  private buildModelsKeysSet(manifest: LLMProviderManifest): LLMModelKeysSet {
    return {
      embeddingsModelKey: manifest.models.embeddings.modelKey,
      primaryCompletionModelKey: manifest.models.primaryCompletion.modelKey,
      ...(manifest.models.secondaryCompletion && {
        secondaryCompletionModelKey: manifest.models.secondaryCompletion.modelKey,
      }),
    };
  }

  /**
   * Build resolved model metadata from manifest and environment
   */
  private buildModelsMetadata(
    manifest: LLMProviderManifest,
    env: EnvVars,
  ): Record<string, ResolvedLLMModelMetadata> {
    const resolveUrn = (model: LLMModelMetadata): string => {
      const value = env[model.urnEnvKey];

      if (typeof value !== "string" || value.length === 0) {
        throw new BadConfigurationLLMError(
          `Required environment variable ${model.urnEnvKey} is not set, is empty, or is not a string. Found: ${String(value)}`,
        );
      }

      return value;
    };
    const models = [
      manifest.models.embeddings,
      manifest.models.primaryCompletion,
      manifest.models.secondaryCompletion,
    ].filter(isDefined);
    return Object.fromEntries(
      models.map((model) => [model.modelKey, { ...model, urn: resolveUrn(model) }]),
    );
  }
}
