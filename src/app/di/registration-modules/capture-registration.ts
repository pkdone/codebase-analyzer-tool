/**
 * DI registrations for the capture module.
 */

import { container } from "tsyringe";
import { captureTokens } from "../tokens";
import { promptRegistry } from "../../prompts/prompt-registry";
import { sourceConfigMap } from "../../prompts/definitions/sources/sources.config";
import { FileSummarizerService } from "../../components/capture/file-summarizer.service";

/**
 * Register capture module dependencies in the container.
 * This includes the FileSummarizerService and its dependencies (PromptRegistry, SourceConfigMap).
 */
export function registerCaptureDependencies(): void {
  // Register the prompt registry as a value (singleton)
  container.register(captureTokens.PromptRegistry, { useValue: promptRegistry });

  // Register the source config map as a value (singleton)
  container.register(captureTokens.SourceConfigMap, { useValue: sourceConfigMap });

  // Register the FileSummarizerService
  container.register(captureTokens.FileSummarizerService, { useClass: FileSummarizerService });
}
