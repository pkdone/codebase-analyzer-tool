/**
 * Centralized file handling configuration and utilities.
 * This module consolidates:
 * - File processing rules (ignore lists, binary extensions)
 * - File type mapping logic
 *
 * For canonical file type definitions (schema, type, constants),
 * import from 'schemas/canonical-file-types'.
 */

export { fileProcessingRules, type FileProcessingRulesType } from "./file-processing-rules";

export { getCanonicalFileType } from "./file-type-mapping";
