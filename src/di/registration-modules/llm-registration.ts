import { container } from "tsyringe";
import { LLMProviderManager } from "../../llm/llm-provider-manager";
import LLMRouter from "../../llm/llm-router";
import LLMStats from "../../llm/tracking/llm-stats";
import { LLMStatsReporter } from "../../llm/tracking/llm-stats-reporter";
import { PromptAdaptationStrategy } from "../../llm/strategies/prompt-adaptation-strategy";
import { JsonProcessor } from "../../llm/json-processing/core/json-processor";
import { llmTokens } from "../tokens";

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
 * Initializes and registers LLM components.
 * This function should be called during application bootstrap after registering dependencies.
 */
export function initializeAndRegisterLLMComponents(): void {
  if (container.isRegistered(llmTokens.LLMProviderManager)) {
    console.log("LLM components already registered - skipping initialization");
    return;
  }

  // Only initialize if LLM model family is registered (i.e., LLM env vars were available)
  if (!container.isRegistered(llmTokens.LLMModelFamily)) {
    console.log("LLM model family not registered, skipping LLM component initialization.");
    return;
  }

  // Register LLMProviderManager as a singleton with factory registration
  // The manager initializes itself in the constructor
  const modelFamily = container.resolve<string>(llmTokens.LLMModelFamily);
  container.register(llmTokens.LLMProviderManager, {
    useFactory: (c) => {
      const jsonProcessor = c.resolve<JsonProcessor>(llmTokens.JsonProcessor);
      return new LLMProviderManager(modelFamily, jsonProcessor);
    },
  });
  console.log("LLMProviderManager registered");

  // Register LLMRouter as a singleton (now that LLMProviderManager is ready)
  container.registerSingleton(llmTokens.LLMRouter, LLMRouter);
  console.log("LLMRouter registered as singleton");
}
