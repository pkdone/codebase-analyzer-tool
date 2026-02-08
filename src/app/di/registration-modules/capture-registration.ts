/**
 * DI registrations for the capture module.
 *
 * This module registers all capture-related components:
 * - CodebaseCaptureOrchestrator (main capture orchestrator)
 * - FileSummarizerService (LLM-based file summarization)
 * - BufferedSourcesWriter (batched database writes)
 * - FileTypePromptRegistry (prompt configuration)
 */

import { container } from "tsyringe";
import { captureTokens, repositoryTokens } from "../tokens";
import { fileTypePromptRegistry } from "../../prompts/sources/sources.definitions";
import { FileSummarizerService } from "../../components/capture/file-summarizer.service";
import { BufferedSourcesWriter } from "../../components/capture/buffered-sources-writer";
import CodebaseCaptureOrchestrator from "../../components/capture/codebase-capture-orchestrator";
import type { SourcesRepository } from "../../repositories/sources/sources.repository.interface";

/**
 * Register capture module dependencies in the container.
 * This includes all components needed for the codebase capture workflow.
 */
export function registerCaptureDependencies(): void {
  // Register the file type prompt registry as a value (singleton)
  container.register(captureTokens.FileTypePromptRegistry, { useValue: fileTypePromptRegistry });

  // Register the FileSummarizerService
  container.register(captureTokens.FileSummarizerService, { useClass: FileSummarizerService });

  // Register the BufferedSourcesWriter using a factory
  // (tsyringe cannot inject primitive types like number, so we use a factory to pass defaults)
  container.register(captureTokens.BufferedSourcesWriter, {
    useFactory: (c) => {
      const sourcesRepository = c.resolve<SourcesRepository>(repositoryTokens.SourcesRepository);
      return new BufferedSourcesWriter(sourcesRepository);
    },
  });

  // Register the main capture orchestrator
  container.registerSingleton(
    captureTokens.CodebaseCaptureOrchestrator,
    CodebaseCaptureOrchestrator,
  );
}
