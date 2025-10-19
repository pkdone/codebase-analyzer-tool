import { z } from "zod";

/**
 * Configuration for prompts that need file type and instructions
 */
export interface SourcePromptTemplate<T extends z.ZodType = z.ZodType> {
  schema: T;
  contentDesc: string;
  instructions: string;
  hasComplexSchema: boolean;
}
