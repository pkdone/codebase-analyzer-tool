/**
 * DI registrations for the capture module.
 */

import { container } from "tsyringe";
import { captureTokens } from "../tokens";
import { fileTypePromptRegistry } from "../../prompts/sources/sources.definitions";
import { FileSummarizerService } from "../../components/capture/file-summarizer.service";
import { BufferedSourcesWriter } from "../../components/capture/buffered-sources-writer";

/**
 * Register capture module dependencies in the container.
 * This includes the FileSummarizerService, BufferedSourcesWriter, and their dependencies.
 */
export function registerCaptureDependencies(): void {
  // Register the file type prompt registry as a value (singleton)
  container.register(captureTokens.FileTypePromptRegistry, { useValue: fileTypePromptRegistry });

  // Register the FileSummarizerService
  container.register(captureTokens.FileSummarizerService, { useClass: FileSummarizerService });

  // Register the BufferedSourcesWriter
  container.register(captureTokens.BufferedSourcesWriter, { useClass: BufferedSourcesWriter });
}
