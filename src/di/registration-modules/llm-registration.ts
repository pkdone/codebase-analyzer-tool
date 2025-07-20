import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { LLMService } from "../../llm/core/llm-service";
import LLMRouter from "../../llm/core/llm-router";
import { EnvVars } from "../../lifecycle/env.types";
import LLMStats from "../../llm/core/utils/routerTracking/llm-stats";
import { PromptAdaptationStrategy } from "../../llm/core/strategies/prompt-adaptation-strategy";
import { RetryStrategy } from "../../llm/core/strategies/retry-strategy";
import { FallbackStrategy } from "../../llm/core/strategies/fallback-strategy";
import { LLMExecutionPipeline } from "../../llm/core/llm-execution-pipeline";

/**
 * Registers the LLM utility services in the container.
 * Note: LLMRouter is now initialized and registered separately via initializeAndRegisterLLMRouter().
 */
export function registerLLMServices(): void {
  // Register LLM utility classes
  container.registerSingleton(TOKENS.LLMStats, LLMStats);
  container.registerSingleton(TOKENS.PromptAdaptationStrategy, PromptAdaptationStrategy);
  // RetryStrategy and FallbackStrategy are created manually in initializeAndRegisterLLMRouter

  console.log("LLM utility services registered");
}

/**
 * Initializes the LLMRouter asynchronously and registers it as a singleton in the container.
 * This isolates all async logic to a single initialization point.
 *
 * @param modelFamily Optional model family override for testing
 * @returns Promise<LLMRouter> The initialized LLMRouter instance
 */
export async function initializeAndRegisterLLMRouter(modelFamily?: string): Promise<LLMRouter> {
  // Initialize LLMService
  const resolvedModelFamily =
    modelFamily ??
    (container.isRegistered(TOKENS.LLMModelFamily)
      ? container.resolve<string>(TOKENS.LLMModelFamily)
      : "TestProvider");

  const service = new LLMService(resolvedModelFamily);
  await service.initialize();
  console.log("LLM Service initialized");

  // Create LLMRouter with its dependencies
  const envVars = container.resolve<EnvVars>(TOKENS.EnvVars);
  const llmStats = container.resolve<LLMStats>(TOKENS.LLMStats);
  const promptAdaptationStrategy = container.resolve<PromptAdaptationStrategy>(
    TOKENS.PromptAdaptationStrategy,
  );
  const retryStrategy = new RetryStrategy(llmStats);
  const fallbackStrategy = new FallbackStrategy();

  // Create the execution pipeline with the strategies
  const executionPipeline = new LLMExecutionPipeline(
    retryStrategy,
    fallbackStrategy,
    promptAdaptationStrategy,
    llmStats,
  );

  // Create LLMRouter with the pipeline
  const router = new LLMRouter(service, envVars, llmStats, executionPipeline);

  // Register the initialized LLMRouter as a singleton
  container.registerInstance(TOKENS.LLMRouter, router);
  console.log("LLM Router initialized and registered as singleton");

  return router;
}
