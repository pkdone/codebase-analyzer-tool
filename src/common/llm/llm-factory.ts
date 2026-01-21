import { LLMModuleConfig } from "./config/llm-module-config.types";
import LLMRouter from "./llm-router";
import LLMExecutionStats from "./tracking/llm-execution-stats";

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
  // The router now creates its own execution pipeline with the appropriate configuration
  const router = new LLMRouter(config);
  return { router, stats: router.stats };
}
