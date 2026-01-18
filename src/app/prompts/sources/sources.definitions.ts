import type { CanonicalFileType } from "../../schemas/canonical-file-types";
import {
  CODE_DATA_BLOCK_HEADER,
  type SourceConfigEntry,
} from "./definitions/source-config-factories";
import { standardCodeDefinitions } from "./definitions/standard-code.definitions";
import { dependencyFileDefinitions } from "./definitions/dependency-files.definitions";
import { specialFileDefinitions } from "./definitions/special-files.definitions";

export { CODE_DATA_BLOCK_HEADER };

/**
 * Centralized registry mapping file types to their prompt definitions and schemas.
 * Each entry directly defines its responseSchema using sourceSummarySchema.pick().
 *
 * Standard programming languages (Java, JavaScript, C#, Python, Ruby, C, C++) use the
 * createStandardCodeConfig factory to ensure consistent instruction patterns.
 *
 * The `satisfies` pattern validates that the object conforms to the Record structure
 * while preserving the inferred literal types of each entry. This enables TypeScript
 * to provide better type inference when accessing specific file type keys.
 */
export const fileTypePromptRegistry = {
  ...standardCodeDefinitions,
  ...dependencyFileDefinitions,
  ...specialFileDefinitions,
} satisfies Record<CanonicalFileType, SourceConfigEntry>;

/**
 * Type alias for the fileTypePromptRegistry that preserves specific schema types for each file type.
 * Use this type when you need compile-time access to the exact schema for a specific file type.
 */
export type FileTypePromptRegistry = typeof fileTypePromptRegistry;
