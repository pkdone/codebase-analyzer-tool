import { container } from "tsyringe";
import { TOKENS } from "../tokens";
import { registerComponents } from "../registration-utils";

// Capture component imports
import { FileSummarizer } from "../../components/capture/file-summarizer";
import { PromptConfigFactory } from "../../components/capture/file-handler-factory";
import CodebaseToDBLoader from "../../components/capture/codebase-to-db-loader";
import { fileTypeMappingsConfig } from "../../config/file-type-mappings.config";

/**
 * Register capture-related components in the DI container.
 *
 * This module handles the registration of components responsible for:
 * - File processing and summarization
 * - Codebase loading into database
 * - File handling configuration
 */
export function registerCaptureComponents(): void {
  // Register configuration
  container.registerInstance(TOKENS.FileTypeMappingsConfig, fileTypeMappingsConfig);
  
  registerComponents(
    [{ token: TOKENS.PromptConfigFactory, implementation: PromptConfigFactory }],
    "Capture components registered",
  );
}

/**
 * Register capture components that depend on LLM services.
 * These components require LLM functionality to be available.
 */
export function registerLLMDependentCaptureComponents(): void {
  registerComponents(
    [
      { token: TOKENS.FileSummarizer, implementation: FileSummarizer },
      { token: TOKENS.CodebaseToDBLoader, implementation: CodebaseToDBLoader },
    ],
    "LLM-dependent capture components registered",
  );
}
