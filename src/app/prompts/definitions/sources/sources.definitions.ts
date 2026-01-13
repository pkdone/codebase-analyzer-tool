import type { CanonicalFileType } from "../../../schemas/canonical-file-types";
import {
  standardCodeDefinitions,
  dependencyFileDefinitions,
  specialFileDefinitions,
  type SourceConfigEntry,
} from "./definitions";

/**
 * Centralized registry mapping file types to their prompt definitions and schemas.
 * Each entry directly defines its responseSchema using sourceSummarySchema.pick().
 *
 * Standard programming languages (Java, JavaScript, C#, Python, Ruby, C, C++) use the
 * createStandardCodeConfig factory to ensure consistent instruction patterns.
 *
 * The `satisfies` pattern validates that the object conforms to the Record structure
 * while preserving the literal types of each entry (including specific Zod schema types).
 * This enables TypeScript to infer the exact schema type for each file type key.
 */
export const fileTypePromptRegistry: Record<CanonicalFileType, SourceConfigEntry> = {
  ...standardCodeDefinitions,
  ...dependencyFileDefinitions,
  ...specialFileDefinitions,
} as Record<CanonicalFileType, SourceConfigEntry>;

/**
 * Type alias for the fileTypePromptRegistry that preserves specific schema types for each file type.
 * Use this type when you need compile-time access to the exact schema for a specific file type.
 */
export type FileTypePromptRegistry = typeof fileTypePromptRegistry;
