import { PromptDefinition } from "./prompt-definition.types";

/**
 * Configuration for prompts that need file type and instructions
 * Extends PromptDefinition to ensure consistent structure
 */
export interface SourcePromptTemplate extends PromptDefinition {
  hasComplexSchema: boolean; // Set to true if any LLM provider that supports providing JSON schema with the LLM call will choke on the schema we generate for this file type (e.g. VertexAI's JSON Schema support is very crude)
}

/** Inferred TypeScript type for canonical file types */
export type CanonicalFileType =
  (typeof import("./sources-file-types").CANONICAL_FILE_TYPES)[number];
