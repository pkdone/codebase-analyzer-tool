import { container } from "tsyringe";
import { createLLMRouter } from "../../../common/llm/llm-factory";
import { buildLLMModuleConfig } from "../../env/llm-config-builder";
import type { EnvVars } from "../../env/env.types";
import { llmTokens, coreTokens } from "../tokens";

/**
 * Initializes and registers LLM components.
 * This function should be called during application bootstrap after registering dependencies.
 * Validates credentials at startup to fail fast if authentication is missing or expired.
 */
export async function initializeAndRegisterLLMComponents(): Promise<void> {
  if (container.isRegistered(llmTokens.LLMRouter)) {
    console.log("LLM components already registered - skipping initialization");
    return;
  }

  // Get configuration from DI container
  const envVars = container.resolve<EnvVars>(coreTokens.EnvVars);

  // Build LLM module configuration from chain-based env vars
  const llmConfig = buildLLMModuleConfig(envVars);

  // Create LLM router using factory
  const { router, stats } = createLLMRouter(llmConfig);

  // Validate credentials at startup to fail fast if authentication is missing or expired
  // This is especially important for AWS SSO where credentials expire and require `aws sso login`
  await router.validateCredentials();

  // Register LLMRouter, LLMExecutionStats, and LLMModuleConfig instances in DI container
  container.registerInstance(llmTokens.LLMRouter, router);
  container.registerInstance(llmTokens.LLMExecutionStats, stats);
  container.registerInstance(llmTokens.LLMModuleConfig, llmConfig);

  console.log("LLMRouter registered as singleton");
}
