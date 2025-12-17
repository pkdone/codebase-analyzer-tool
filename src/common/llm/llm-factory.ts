import { LLMModuleConfig } from "./config/llm-module-config.types";
import LLMRouter from "./llm-router";
import { LLMExecutionPipeline } from "./llm-execution-pipeline";
import { RetryStrategy } from "./strategies/retry-strategy";
import { FallbackStrategy } from "./strategies/fallback-strategy";
import { PromptAdaptationStrategy } from "./strategies/prompt-adaptation-strategy";
import LLMStats from "./tracking/llm-stats";
import { LLMErrorLogger } from "./tracking/llm-error-logger";

/**
 * Result of creating an LLM Router, including the router and its stats instance.
 */
export interface LLMRouterComponents {
  router: LLMRouter;
  stats: LLMStats;
}

/**
 * Factory function to create a fully configured LLM Router instance.
 * This function instantiates all required dependencies and wires them together,
 * making the LLM module usable without a dependency injection framework.
 *
 * @param config Configuration for the LLM module
 * @returns An object containing the configured LLMRouter and LLMStats instances
 *
 * @example
 * ```typescript
 * const config: LLMModuleConfig = {
 *   modelFamily: "OpenAI",
 *   errorLogging: {
 *     errorLogDirectory: "output/errors",
 *     errorLogFilenameTemplate: "error-{timestamp}.log",
 *   },
 *   providerParameters: process.env as Record<string, string>,
 * };
 *
 * const { router, stats } = createLLMRouter(config);
 * const result = await router.executeCompletion(...);
 * stats.displayLLMStatusDetails();
 * ```
 */
export function createLLMRouter(config: LLMModuleConfig): LLMRouterComponents {
  // Instantiate dependencies in correct order (no circular dependencies)
  const errorLogger = new LLMErrorLogger(config.errorLogging);
  const llmStats = new LLMStats();
  const retryStrategy = new RetryStrategy(llmStats);
  const fallbackStrategy = new FallbackStrategy();
  const promptAdaptationStrategy = new PromptAdaptationStrategy();

  const executionPipeline = new LLMExecutionPipeline(
    retryStrategy,
    fallbackStrategy,
    promptAdaptationStrategy,
    llmStats,
  );

  const router = new LLMRouter(config, executionPipeline, errorLogger);

  return { router, stats: llmStats };
}
