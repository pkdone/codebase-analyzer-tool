/**
 * Barrel export for prompts module.
 *
 * This module provides the centralized prompt registry and rendering functionality
 * for all LLM interactions in the application.
 */

// Registry
export { promptManager, type PromptManager } from "./prompt-registry";

// Renderer
export { renderPrompt, buildSchemaSection, type RenderPromptData } from "./prompt-renderer";

// Types and constants
export {
  DATA_BLOCK_HEADERS,
  type PromptDefinition,
  type DataBlockHeader,
  type PromptConfigEntry,
  type AppSummaryConfigEntry,
} from "./prompt.types";

// Templates
export {
  BASE_PROMPT_TEMPLATE,
  CODEBASE_QUERY_TEMPLATE,
  FORCE_JSON_FORMAT,
  DEFAULT_SYSTEM_ROLE,
} from "./templates";

// Definitions - only export high-level config maps, not internal fragments
export {
  appSummaryConfigMap,
  type AppSummaryConfigMap,
} from "./definitions/app-summaries/app-summaries.definitions";
export { createAppSummaryConfig } from "./definitions/app-summaries/app-summaries.factories";
export {
  fileTypePromptRegistry,
  type FileTypePromptRegistry,
} from "./definitions/sources/sources.definitions";
export { type SourceConfigEntry } from "./definitions/sources/definitions";
