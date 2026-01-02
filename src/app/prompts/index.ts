/**
 * Barrel export for prompts module.
 *
 * This module provides the centralized prompt registry and rendering functionality
 * for all LLM interactions in the application.
 */

// Registry and factories
export { promptRegistry, createReduceInsightsPrompt, type PromptRegistry } from "./prompt-registry";

// Renderer
export { renderPrompt } from "./prompt-renderer";

// Types
export type { PromptDefinition, DataBlockHeader, BasePromptConfigEntry } from "./prompt.types";

// Templates
export { BASE_PROMPT_TEMPLATE, CODEBASE_QUERY_TEMPLATE, FORCE_JSON_FORMAT } from "./templates";

// Definitions - only export high-level config maps, not internal fragments
export {
  appSummaryConfigMap,
  type AppSummaryConfigEntry,
} from "./definitions/app-summaries/app-summaries.definitions";
export {
  sourceConfigMap,
  type SourceConfigEntry,
  type SourceConfigMap,
} from "./definitions/sources/sources.definitions";
