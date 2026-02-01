/**
 * Centralized file handling configuration.
 * This module consolidates:
 * - File processing rules (ignore lists, binary extensions)
 * - File type registry (mappings from extensions/filenames to canonical types)
 *
 * Note: File type mapping logic (getCanonicalFileType) has been moved to
 * 'components/capture/utils' as it contains business logic, not just config.
 *
 * For canonical file type definitions (schema, type, constants),
 * import from 'schemas/canonical-file-types'.
 */

export { fileProcessingRules, type FileProcessingRulesType } from "./file-processing-rules";
