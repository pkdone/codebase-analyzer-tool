import { captureTokens } from "../tokens";
import { registerComponents } from "../registration-utils";

// Capture component imports
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
  // PromptConfigFactory removed; FileSummarizer now resolves file type directly.
  registerComponents([], "Capture components registered (no prompt factory)");
}

/**
 * Register capture components that depend on LLM services.
 * These components require LLM functionality to be available.
 */
export function registerLLMDependentCaptureComponents(): void {
  registerComponents(
    [{ token: captureTokens.CodebaseToDBLoader, implementation: CodebaseToDBLoader }],
    "LLM-dependent capture components registered",
  );
}
