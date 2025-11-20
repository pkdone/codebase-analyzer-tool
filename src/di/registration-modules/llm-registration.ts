import { container } from "tsyringe";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";
import LLMRouter from "../../llm/core/llm-router";
import LLMStats from "../../llm/core/tracking/llm-stats";
import { LLMStatsReporter } from "../../llm/core/tracking/llm-stats-reporter";
import { PromptAdaptationStrategy } from "../../llm/core/strategies/prompt-adaptation-strategy";
import { JsonProcessor } from "../../llm/json-processing/core/json-processor";
import { llmTokens } from "../tokens";
import { coreTokens } from "../tokens";

/**
 * Register LLM provider management services in the DI container.
 *
 * This module handles the registration of LLM provider management services,
 * including proper initialization of LLMProviderManager with async dependencies.
 */
export function registerLLMProviders(): void {
  // Register LLM utility classes
  container.registerSingleton(llmTokens.JsonProcessor, JsonProcessor);
  container.registerSingleton(llmTokens.LLMStats, LLMStats);
  container.registerSingleton(llmTokens.LLMStatsReporter, LLMStatsReporter);
  container.registerSingleton(llmTokens.PromptAdaptationStrategy, PromptAdaptationStrategy);
  // RetryStrategy, FallbackStrategy, and LLMExecutionPipeline are now registered in app-registration.ts

  console.log("LLM services registered");
}

/**
 * Initializes and registers LLM components that require async initialization.
 * This function should be called during application bootstrap after registering dependencies.
 */
export async function initializeAndRegisterLLMComponents(): Promise<void> {
  if (container.isRegistered(llmTokens.LLMProviderManager)) {
    console.log("LLM components already registered - skipping initialization");
    return;
  }

  // Only initialize if LLM model family is registered (i.e., LLM env vars were available)
  if (!container.isRegistered(llmTokens.LLMModelFamily)) {
    console.log("LLM model family not registered, skipping LLM component initialization.");
    return;
  }

  // Directly instantiate, initialize, and register to avoid resolve/re-register pattern
  const modelFamily = container.resolve<string>(llmTokens.LLMModelFamily);
  const jsonProcessor = container.resolve<JsonProcessor>(llmTokens.JsonProcessor);
  const manager = new LLMProviderManager(modelFamily, jsonProcessor);
  await manager.initialize();

  // Register the initialized instance
  container.registerInstance(llmTokens.LLMProviderManager, manager);
  console.log("LLMProviderManager registered with async initialization");

  // Register LLMRouter as a singleton (now that LLMProviderManager is ready)
  container.registerSingleton(llmTokens.LLMRouter, LLMRouter);
  console.log("LLMRouter registered as singleton");

  // Register LLMRouter as a shutdownable component for automatic cleanup
  container.register(coreTokens.Shutdownable, {
    useFactory: (c) => c.resolve(llmTokens.LLMRouter),
  });
  console.log("LLMRouter registered as shutdownable component");
}
