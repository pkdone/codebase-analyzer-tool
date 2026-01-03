/**
 * DI registrations for the capture module.
 */

import { container } from "tsyringe";
import { captureTokens } from "../tokens";
import { promptManager } from "../../prompts/prompt-registry";
import { sourceConfigMap } from "../../prompts/definitions/sources/sources.definitions";
import { FileSummarizerService } from "../../components/capture/file-summarizer.service";

/**
 * Register capture module dependencies in the container.
 * This includes the FileSummarizerService and its dependencies (PromptManager, SourceConfigMap).
 */
export function registerCaptureDependencies(): void {
  // Register the prompt registry as a value (singleton)
  container.register(captureTokens.PromptManager, { useValue: promptManager });

  // Register the source config map as a value (singleton)
  container.register(captureTokens.SourceConfigMap, { useValue: sourceConfigMap });

  // Register the FileSummarizerService
  container.register(captureTokens.FileSummarizerService, { useClass: FileSummarizerService });
}
