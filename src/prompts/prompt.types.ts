import { z } from "zod";
import { AppSummaryCategories } from "../schemas/app-summaries.schema";
import {
  CANONICAL_FILE_TYPES,
  type CanonicalFileType,
  canonicalFileTypeSchema,
} from "../config/file-types.config";

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
  /** Optional label for UI display and logging (e.g., "Aggregates", "Java Source") */
  label?: string;
  /** Template string for rendering the prompt */
  template: string;
}

// Re-export from config to maintain backward compatibility
export { CANONICAL_FILE_TYPES, type CanonicalFileType, canonicalFileTypeSchema };

/**
 * Explicit type for app summary categories
 * This replaces z.infer<typeof AppSummaryCategories> throughout the codebase
 */
export type AppSummaryCategoryType = z.infer<typeof AppSummaryCategories>;
