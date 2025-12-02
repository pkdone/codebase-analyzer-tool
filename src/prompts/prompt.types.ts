import { z } from "zod";
import { AppSummaryCategories } from "../schemas/app-summaries.schema";
import type { CanonicalFileType } from "../config/file-types.config";

/**
 * Valid values for the data section header in prompt templates.
 * These correspond to the different prompt families we support.
 */
export type DataBlockHeader = "CODE" | "FILE_SUMMARIES" | "FRAGMENTED_DATA";

/**
 * Formal prompt definition interface for consistent structure
 * This enforces a standard shape for prompt configurations across the application.
 */
export interface PromptDefinition {
  /** Description of the content being analyzed (e.g., "JVM code", "source files") */
  contentDesc: string;
  /** Array of instruction strings for the LLM. Instructions can include section titles
   * formatted as "__TITLE__\n- Point 1" for better organization. */
  instructions: readonly string[];
  /** Zod schema for validating the LLM response */
  responseSchema: z.ZodType;
  /** Whether the schema is complex and incompatible with some LLM providers */
  hasComplexSchema?: boolean;
  /** Optional label for UI display and logging (e.g., "Aggregates", "Java Source") */
  label?: string;
  /** Template string for rendering the prompt */
  template: string;
  /** Header text for the data block section (e.g., "CODE", "FILE_SUMMARIES", "FRAGMENTED_DATA") */
  dataBlockHeader: DataBlockHeader;
  /** Whether to wrap the content in code block markers (```). Defaults to false. */
  wrapInCodeBlock?: boolean;
}

/**
 * Type export for canonical file types (runtime values should be imported from file-types.config.ts)
 */
export type { CanonicalFileType };

/**
 * Explicit type for app summary categories
 * This replaces z.infer<typeof AppSummaryCategories> throughout the codebase
 */
export type AppSummaryCategoryType = z.infer<typeof AppSummaryCategories>;
