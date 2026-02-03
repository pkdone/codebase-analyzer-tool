/**
 * DI registrations for the capture module.
 *
 * This module registers all capture-related components:
 * - CodebaseIngestionService (main capture orchestrator)
 * - FileSummarizerService (LLM-based file summarization)
 * - BufferedSourcesWriter (batched database writes)
 * - FileTypePromptRegistry (prompt configuration)
 */

import { container } from "tsyringe";
import { captureTokens } from "../tokens";
import { fileTypePromptRegistry } from "../../prompts/sources/sources.definitions";
import { FileSummarizerService } from "../../components/capture/file-summarizer.service";
import { BufferedSourcesWriter } from "../../components/capture/buffered-sources-writer";
import CodebaseIngestionService from "../../components/capture/codebase-ingestion.service";

/**
 * Register capture module dependencies in the container.
 * This includes all components needed for the codebase capture workflow.
 */
export function registerCaptureDependencies(): void {
  // Register the file type prompt registry as a value (singleton)
  container.register(captureTokens.FileTypePromptRegistry, { useValue: fileTypePromptRegistry });

  // Register the FileSummarizerService
  container.register(captureTokens.FileSummarizerService, { useClass: FileSummarizerService });

  // Register the BufferedSourcesWriter
  container.register(captureTokens.BufferedSourcesWriter, { useClass: BufferedSourcesWriter });

  // Register the main capture orchestrator
  container.registerSingleton(captureTokens.CodebaseIngestionService, CodebaseIngestionService);
}
