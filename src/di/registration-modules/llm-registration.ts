import { container } from "tsyringe";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";
import LLMRouter from "../../llm/core/llm-router";
import LLMStats from "../../llm/core/tracking/llm-stats";
import { LLMStatsReporter } from "../../llm/core/tracking/llm-stats-reporter";
import { PromptAdaptationStrategy } from "../../llm/core/strategies/prompt-adaptation-strategy";
import { LLMInfoProvider } from "../../llm/core/llm-info-provider";
import { TOKENS } from "../../tokens";

/**
 * Register LLM provider management services in the DI container.
 *
 * This module handles the registration of LLM provider management services,
 * including proper initialization of LLMProviderManager with async dependencies.
 */
export function registerLLMProviders(): void {
  // Register LLM utility classes
  container.registerSingleton(TOKENS.LLMStats, LLMStats);
  container.registerSingleton(TOKENS.LLMStatsReporter, LLMStatsReporter);
  container.registerSingleton(TOKENS.PromptAdaptationStrategy, PromptAdaptationStrategy);
  container.registerSingleton(TOKENS.LLMInfoProvider, LLMInfoProvider);
  // RetryStrategy, FallbackStrategy, and LLMExecutionPipeline are now registered in app-registration.ts

  console.log("LLM services registered");
}

/**
 * Initializes and registers LLM components that require async initialization.
 * This function should be called during application bootstrap after registering dependencies.
 */
export async function initializeAndRegisterLLMComponents(): Promise<void> {
  if (container.isRegistered(TOKENS.LLMProviderManager)) {
    console.log("LLM components already registered - skipping initialization");
    return;
  }

  // Directly instantiate, initialize, and register to avoid resolve/re-register pattern
  const modelFamily = container.resolve<string>(TOKENS.LLMModelFamily);
  const manager = new LLMProviderManager(modelFamily);
  await manager.initialize();

  // Register the initialized instance
  container.registerInstance(TOKENS.LLMProviderManager, manager);
  console.log("LLMProviderManager registered with async initialization");

  // Register LLMRouter as a singleton (now that LLMProviderManager is ready)
  container.registerSingleton(TOKENS.LLMRouter, LLMRouter);
  console.log("LLMRouter registered as singleton");
}
