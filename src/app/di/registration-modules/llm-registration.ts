import { container } from "tsyringe";
import { createLLMRouter } from "../../../common/llm/llm-factory";
import { LLMStatsReporter } from "../../../common/llm/tracking/llm-stats-reporter";
import { buildLLMModuleConfig } from "../../env/llm-config-builder";
import { EnvVars } from "../../env/env.types";
import { llmTokens, coreTokens } from "../tokens";

/**
 * Register LLM provider management services in the DI container.
 *
 * This module handles the registration of LLM provider management services.
 * The LLM module is now standalone and instantiated via factory functions.
 */
export function registerLLMProviders(): void {
  // LLM module is now instantiated via factory, no individual service registration needed
  console.log("LLM services ready for initialization");
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

  // Get configuration from DI container
  const envVars = container.resolve<EnvVars>(coreTokens.EnvVars);
  const modelFamily = container.resolve<string>(llmTokens.LLMModelFamily);

  // Build LLM module configuration
  const llmConfig = buildLLMModuleConfig(envVars, modelFamily);

  // Create LLM router using factory
  const { router, stats } = createLLMRouter(llmConfig);

  // Register LLMRouter instance in DI container for application use
  container.registerInstance(llmTokens.LLMRouter, router);

  // Create and register stats reporter (for displaying stats)
  const llmStatsReporter = new LLMStatsReporter(stats);
  container.registerInstance(llmTokens.LLMStatsReporter, llmStatsReporter);

  console.log("LLMRouter registered as singleton");
}
