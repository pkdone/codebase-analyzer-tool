/**
 * Common prompts module - provides reusable prompt utilities and types.
 *
 * This module exports generic prompt-related functionality designed
 * to be portable across projects.
 */

// Type exports
export type { GeneratedPrompt, TextGeneratedPrompt, PromptMetadata } from "./types";

// Class and template exports
export {
  JSONSchemaPrompt,
  JSON_SCHEMA_PROMPT_TEMPLATE,
  FORCE_JSON_FORMAT_INSTRUCTIONS,
} from "./json-schema-prompt";
export type { JSONSchemaPromptConfig } from "./json-schema-prompt";
