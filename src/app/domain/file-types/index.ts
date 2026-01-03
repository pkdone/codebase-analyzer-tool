/**
 * Centralized file type domain logic.
 * This module consolidates all file type identity logic including:
 * - Canonical file type definitions
 * - File processing rules (ignore lists, binary extensions)
 * - File type mapping logic
 */

export {
  CANONICAL_FILE_TYPES,
  type CanonicalFileType,
  canonicalFileTypeSchema,
} from "./canonical-file-types";

export { fileProcessingRules } from "./file-processing-rules";

export { getCanonicalFileType } from "./file-type-mapping";
