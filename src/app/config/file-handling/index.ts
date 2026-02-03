/**
 * Centralized file handling configuration.
 * This module consolidates:
 * - File processing rules (ignore lists, binary extensions)
 * - File type registry (mappings from extensions/filenames to canonical types)
 *
 * For canonical file type definitions (schema, type, constants),
 * import from 'schemas/canonical-file-types'.
 */

export { fileProcessingRules, type FileProcessingRulesType } from "./file-processing-rules";
