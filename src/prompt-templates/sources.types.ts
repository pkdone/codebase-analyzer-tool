import { z } from "zod";

/**
 * Configuration for prompts that need file type and instructions
 */
export interface SourcePromptTemplate<T extends z.ZodType = z.ZodType> {
  contentDesc: string;
  hasComplexSchema: boolean; // Set to true if any LLM provider that supports providing JSON schema with the LLM call will choke on the schema we generate for this file type (e.g. VertexAI's JSON Schema support is very crude)
  responseSchema: T;
  instructions: string;
}

/** Inferred TypeScript type for canonical file types */
export type CanonicalFileType = (typeof import("./sources.schemas").CANONICAL_FILE_TYPES)[number];
