import type { LLMModuleConfig } from "./config/llm-module-config.types";
import LLMRouter from "./llm-router";
import { LLMExecutionPipeline, type LLMPipelineConfig } from "./llm-execution-pipeline";
import { ProviderManager } from "./provider-manager";
import { RetryStrategy } from "./strategies/retry-strategy";
import LLMExecutionStats from "./tracking/llm-execution-stats";
import { LLMError, LLMErrorCode } from "./types/llm-errors.types";

/**
 * Result of creating an LLM Router, including the router and its stats instance.
 */
export interface LLMRouterComponents {
  router: LLMRouter;
  stats: LLMExecutionStats;
}

/**
 * Factory function to create a fully configured LLM Router instance.
 * This function instantiates all required dependencies and wires them together,
 * making the LLM module usable without a dependency injection framework.
 *
 * The factory creates:
 * - ProviderManager: Manages LLM provider instances
 * - LLMExecutionStats: Tracks execution metrics
 * - RetryStrategy: Handles retry logic for failed requests
 * - LLMExecutionPipeline: Orchestrates execution with retries and fallbacks
 * - LLMRouter: Main entry point for LLM operations
 *
 * @param config Configuration for the LLM module
 * @returns An object containing the configured LLMRouter and LLMExecutionStats instances
 *
 * @example
 * ```typescript
 * const config: LLMModuleConfig = {
 *   errorLogging: {
 *     errorLogDirectory: "output/errors",
 *     errorLogFilenameTemplate: "error-{timestamp}.log",
 *   },
 *   providerParams: process.env as Record<string, string>,
 *   resolvedModelChain: {
 *     completions: [{ providerFamily: "OpenAI", modelKey: "openai-gpt-4o", modelUrn: "gpt-4o" }],
 *     embeddings: [{ providerFamily: "OpenAI", modelKey: "openai-text-embedding-3-small", modelUrn: "..." }],
 *   },
 * };
 *
 * const { router, stats } = createLLMRouter(config);
 * const result = await router.executeCompletion(...);
 * stats.displayLLMStatusDetails();
 * ```
 */
export function createLLMRouter(config: LLMModuleConfig): LLMRouterComponents {
  // Create provider manager with the configuration
  const providerManager = new ProviderManager({
    resolvedModelChain: config.resolvedModelChain,
    providerParams: config.providerParams,
    errorLogging: config.errorLogging,
    providerRegistry: config.providerRegistry,
  });

  // Create execution stats tracker
  const stats = new LLMExecutionStats();

  // Create retry strategy with stats
  const retryStrategy = new RetryStrategy(stats);

  // Get retry config from the first completion provider
  const retryConfig = getRetryConfigFromProvider(providerManager, config);

  // Create pipeline configuration
  const pipelineConfig: LLMPipelineConfig = {
    retryConfig,
    getModelsMetadata: () => providerManager.getAllModelsMetadata(),
  };

  // Create execution pipeline
  const executionPipeline = new LLMExecutionPipeline(retryStrategy, stats, pipelineConfig);

  // Create router with injected dependencies
  const router = new LLMRouter(
    config.resolvedModelChain,
    providerManager,
    executionPipeline,
    stats,
  );

  return { router, stats };
}

/**
 * Extract retry configuration from the first completion provider in the chain.
 * This is used to configure the execution pipeline.
 */
function getRetryConfigFromProvider(providerManager: ProviderManager, config: LLMModuleConfig) {
  const firstEntry = config.resolvedModelChain.completions[0];
  const manifest = providerManager.getManifest(firstEntry.providerFamily);

  if (!manifest) {
    throw new LLMError(
      LLMErrorCode.BAD_CONFIGURATION,
      `Manifest not found for provider: ${firstEntry.providerFamily}`,
    );
  }

  return manifest.providerSpecificConfig;
}
