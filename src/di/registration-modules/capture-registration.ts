import { container } from "tsyringe";
import { TOKENS } from "../tokens";

// Capture component imports
import { FileSummarizer } from "../../components/capture/file-summarizer";
import { PromptConfigFactory } from "../../components/capture/file-handler-factory";
import CodebaseToDBLoader from "../../components/capture/codebase-to-db-loader";

/**
 * Register capture-related components in the DI container.
 * 
 * This module handles the registration of components responsible for:
 * - File processing and summarization
 * - Codebase loading into database
 * - File handling configuration
 */
export function registerCaptureComponents(): void {
  // Register file handling components
  container.registerSingleton(TOKENS.PromptConfigFactory, PromptConfigFactory);
  
  console.log("Capture components registered");
}

/**
 * Register capture components that depend on LLM services.
 * These components require LLM functionality to be available.
 */
export function registerLLMDependentCaptureComponents(): void {
  container.registerSingleton(TOKENS.FileSummarizer, FileSummarizer);
  container.registerSingleton(TOKENS.CodebaseToDBLoader, CodebaseToDBLoader);
  
  console.log("LLM-dependent capture components registered");
}
