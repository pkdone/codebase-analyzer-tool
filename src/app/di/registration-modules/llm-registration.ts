import { container } from "tsyringe";
import { createLLMRouter } from "../../../common/llm/llm-factory";
import { buildLLMModuleConfig } from "../../env/llm-config-builder";
import { EnvVars } from "../../env/env.types";
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

  // Validate credentials at startup to fail fast if authentication is missing or expired
  // This is especially important for AWS SSO where credentials expire and require `aws sso login`
  await router.validateCredentials();

  // Register LLMRouter and LLMExecutionStats instances in DI container for application use
  container.registerInstance(llmTokens.LLMRouter, router);
  container.registerInstance(llmTokens.LLMExecutionStats, stats);

  console.log("LLMRouter registered as singleton");
}
