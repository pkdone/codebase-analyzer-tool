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
 * Type for backward compatibility - can be either array of strings or sections
 */
export type Instructions = readonly string[] | readonly InstructionSection[];

/**
 * Formal prompt definition interface for consistent structure
 * This enforces a standard shape for prompt configurations across the application.
 */
export interface PromptDefinition {
  /** Description of the content being analyzed (e.g., "JVM code", "source files") */
  contentDesc: string;
  /** Array of instructions for the LLM (legacy format), which will be formatted as bullet points */
  instructions: Instructions;
  /** Zod schema for validating the LLM response */
  responseSchema: z.ZodType;
  /** Whether the schema is complex and incompatible with some LLM providers */
  hasComplexSchema?: boolean;
  /** Optional role for the prompt (defaults to "Act as a senior developer.") */
  role?: string;
  /** Content header (e.g., "CODE:", "SOURCES:") - defaults to "CODE:" */
  contentHeader?: string;
}

/**
 * Type guard to check if instructions are in section format
 */
export function areInstructionSections(
  instructions: Instructions,
): instructions is readonly InstructionSection[] {
  return (
    Array.isArray(instructions) &&
    instructions.length > 0 &&
    typeof instructions[0] === "object" &&
    "points" in instructions[0]
  );
}
