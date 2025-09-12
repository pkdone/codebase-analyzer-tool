import { container } from "tsyringe";
import { TOKENS } from "../tokens";

// Querying component imports
import CodeQuestioner from "../../components/querying/code-questioner";

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
  container.registerSingleton(TOKENS.CodeQuestioner, CodeQuestioner);
  
  console.log("LLM-dependent querying components registered");
}
