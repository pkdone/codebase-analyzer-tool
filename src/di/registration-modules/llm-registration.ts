import { container } from "tsyringe";
import LLMRouter from "../../llm/llm-router";
import LLMStats from "../../llm/tracking/llm-stats";
import { LLMStatsReporter } from "../../llm/tracking/llm-stats-reporter";
import { PromptAdaptationStrategy } from "../../llm/strategies/prompt-adaptation-strategy";
import { llmTokens } from "../tokens";

/**
 * Register LLM provider management services in the DI container.
 *
 * This module handles the registration of LLM provider management services.
 */
export function registerLLMProviders(): void {
  // Register LLM utility classes
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
  if (container.isRegistered(llmTokens.LLMRouter)) {
    console.log("LLM components already registered - skipping initialization");
    return;
  }

  // Only initialize if LLM model family is registered (i.e., LLM env vars were available)
  if (!container.isRegistered(llmTokens.LLMModelFamily)) {
    console.log("LLM model family not registered, skipping LLM component initialization.");
    return;
  }

  // Register LLMRouter as a singleton
  // LLMRouter now directly creates the provider using modelFamily and JsonProcessor
  container.registerSingleton(llmTokens.LLMRouter, LLMRouter);
  console.log("LLMRouter registered as singleton");
}
