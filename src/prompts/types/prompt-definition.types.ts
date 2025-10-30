import { z } from "zod";

/**
 * Represents a section of instructions with an optional title
 */
export interface InstructionSection {
  /** Optional title for the instruction section */
  title?: string;
  /** Array of instruction points in this section */
  points: readonly string[];
}

/**
 * Formal prompt definition interface for consistent structure
 * This enforces a standard shape for prompt configurations across the application.
 */
export interface PromptDefinition {
  /** Description of the content being analyzed (e.g., "JVM code", "source files") */
  contentDesc: string;
  /** Array of instruction sections for the LLM, which will be formatted appropriately */
  instructions: readonly InstructionSection[];
  /** Zod schema for validating the LLM response */
  responseSchema: z.ZodType;
  /** Whether the schema is complex and incompatible with some LLM providers */
  hasComplexSchema?: boolean;
  /** Optional role for the prompt (defaults to "Act as a senior developer.") */
  role?: string;
  /** Content header (e.g., "CODE:", "SOURCES:") - defaults to "CODE:" */
  contentHeader?: string;
}
