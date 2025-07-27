import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { LLMService } from "../../llm/core/llm-service";
import LLMRouter from "../../llm/core/llm-router";
import LLMStats from "../../llm/core/utils/routerTracking/llm-stats";
import { PromptAdaptationStrategy } from "../../llm/core/strategies/prompt-adaptation-strategy";

/**
 * Registers the LLM utility services in the container.
 * Note: LLMRouter is now initialized and registered separately via initializeAndRegisterLLMRouter().
 */
export function registerLLMServices(): void {
  // Register LLM utility classes
  container.registerSingleton(TOKENS.LLMStats, LLMStats);
  container.registerSingleton(TOKENS.PromptAdaptationStrategy, PromptAdaptationStrategy);
  // RetryStrategy, FallbackStrategy, and LLMExecutionPipeline are now registered in app-registration.ts

  console.log("LLM utility services registered");
}

/**
 * Factory function to create and initialize LLMService.
 * Handles the async initialization logic required by LLMService.
 *
 * @param modelFamily Optional model family override for testing
 * @returns Promise<LLMService> The initialized LLMService instance
 */
async function createAndInitializeLLMService(modelFamily?: string): Promise<LLMService> {
  const resolvedModelFamily =
    modelFamily ??
    (container.isRegistered(TOKENS.LLMModelFamily)
      ? container.resolve<string>(TOKENS.LLMModelFamily)
      : "TestProvider");

  const service = new LLMService(resolvedModelFamily);
  await service.initialize();
  console.log("LLM Service initialized");
  return service;
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
  // Create and initialize LLMService (this is the only manual creation needed due to async initialization)
  const service = await createAndInitializeLLMService(modelFamily);

  // Register the initialized LLMService as a singleton
  container.registerInstance(TOKENS.LLMService, service);

  // Let the DI container create and resolve LLMRouter with all its dependencies
  // This ensures all components get the same singleton instances (especially LLMStats)
  const router = container.resolve<LLMRouter>(LLMRouter);

  // Register the initialized LLMRouter as a singleton
  container.registerInstance(TOKENS.LLMRouter, router);
  console.log("LLM Router initialized and registered as singleton");

  return router;
}
