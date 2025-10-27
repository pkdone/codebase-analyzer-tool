import { container } from "tsyringe";
import { captureTokens } from "../../components/capture/capture.tokens";

// Querying component imports
import CodebaseQueryProcessor from "../../components/querying/codebase-query-processor";

/**
 * Register querying-related components in the DI container.
 *
 * This module handles the registration of components responsible for:
 * - Code questioning and analysis
 * - Interactive codebase querying functionality
 */
export function registerQueryingComponents(): void {
  console.log("Querying components registered");
}

/**
 * Register querying components that depend on LLM services.
 * These components require LLM functionality to be available.
 */
export function registerLLMDependentQueryingComponents(): void {
  container.registerSingleton(captureTokens.CodebaseQueryProcessor, CodebaseQueryProcessor);

  console.log("LLM-dependent querying components registered");
}
