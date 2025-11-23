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
 * Note: CodebaseQueryProcessor is now a function, so no registration needed.
 */
export function registerLLMDependentQueryingComponents(): void {
  console.log("LLM-dependent querying components registered");
}
