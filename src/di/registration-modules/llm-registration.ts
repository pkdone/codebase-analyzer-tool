import { container } from "tsyringe";
import { LLMProviderManager } from "../../llm/core/llm-provider-manager";
import LLMRouter from "../../llm/core/llm-router";
import LLMStats from "../../llm/core/tracking/llm-stats";
import { PromptAdaptationStrategy } from "../../llm/core/strategies/prompt-adaptation-strategy";
import { TOKENS } from "../tokens";

/**
 * Register LLM provider management services in the DI container.
 *
 * This module handles the registration of LLM provider management services,
 * including proper initialization of LLMProviderManager with async dependencies.
 */
export function registerLLMProviders(): void {
  // Register LLM utility classes
  container.registerSingleton(TOKENS.LLMStats, LLMStats);
  container.registerSingleton(TOKENS.PromptAdaptationStrategy, PromptAdaptationStrategy);
  // RetryStrategy, FallbackStrategy, and LLMExecutionPipeline are now registered in app-registration.ts

  console.log("LLM utility services registered");
}

/**
 * Factory function to create and initialize LLMProviderManager.
 * Handles the async initialization logic required by LLMProviderManager.
 *
 * @param modelFamily - Optional model family override
 * @returns Promise<LLMProviderManager> The initialized LLMProviderManager instance
 */
async function createAndInitializeLLMProviderManager(modelFamily?: string): Promise<LLMProviderManager> {
  // Resolve the model family (use provided or resolve from container)
  const resolvedModelFamily = modelFamily ?? container.resolve<string>(TOKENS.LLMModelFamily);

  // Create the LLMProviderManager instance
  const manager = new LLMProviderManager(resolvedModelFamily);

  // Initialize it asynchronously
  await manager.initialize();

  return manager;
}

/**
 * Initializes the LLMRouter asynchronously and registers it as a singleton in the container.
 * This isolates all async logic to a single initialization point and lets the DI container
 * manage all dependencies to ensure singleton consistency.
 *
 * @param modelFamily Optional model family override for testing
 * @returns Promise<LLMRouter> The initialized LLMRouter instance
 */
export async function initializeAndRegisterLLMRouter(modelFamily?: string): Promise<LLMRouter> {
  // Create and initialize LLMProviderManager (this is the only manual creation needed due to async initialization)
  const manager = await createAndInitializeLLMProviderManager(modelFamily);

  // Register the initialized LLMProviderManager as a singleton
  container.registerInstance(TOKENS.LLMProviderManager, manager);

  // Let the DI container create and resolve LLMRouter with all its dependencies
  // This ensures all components get the same singleton instances (especially LLMStats)
  const router = container.resolve<LLMRouter>(LLMRouter);

  // Register the initialized LLMRouter as a singleton
  container.registerInstance(TOKENS.LLMRouter, router);
  console.log("LLM Router initialized and registered as singleton");

  return router;
}

/**
 * Create and register an initialized LLMProviderManager instance.
 * This is called during application setup to ensure the LLMProviderManager
 * is properly initialized before being used by other services.
 * 
 * @deprecated Use initializeAndRegisterLLMRouter instead
 */
export async function createAndRegisterLLMProviderManager(modelFamily?: string): Promise<void> {
  await initializeAndRegisterLLMRouter(modelFamily);
}
