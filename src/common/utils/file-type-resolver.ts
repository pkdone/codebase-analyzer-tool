import path from "path";
import { fileTypeMappingsConfig } from "../../config/file-type-mappings.config";

/**
 * Resolves the canonical file type based on filepath and detected type.
 * Handles special filename cases and type mappings.
 *
 * @param filepath - The path to the file
 * @param detectedType - The initially detected file type (usually from extension)
 * @returns The resolved canonical file type
 */
export function resolveFileType(filepath: string, detectedType: string): string {
  const filename = path.basename(filepath).toLowerCase();

  // Check if this specific filename has a canonical type mapping
  const canonicalType = fileTypeMappingsConfig.FILENAME_TO_CANONICAL_TYPE_MAPPINGS.get(filename);
  if (canonicalType) return canonicalType;

  // Use the extension-based mapping to determine the canonical type
  return (
    fileTypeMappingsConfig.FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS.get(
      detectedType.toLowerCase(),
    ) ?? fileTypeMappingsConfig.DEFAULT_FILE_TYPE
  );
}

/**
 * Gets the default file type when no specific mapping is found.
 */
export function getDefaultFileType(): string {
  return fileTypeMappingsConfig.DEFAULT_FILE_TYPE;
}

/**
 * Gets the Java file type constant.
 */
export function getJavaFileType(): string {
  return fileTypeMappingsConfig.JAVA_FILE_TYPE;
}

/**
 * Checks if a file type has a specific mapping (either by extension or filename).
 */
export function hasFileTypeMapping(filepath: string, detectedType: string): boolean {
  const filename = path.basename(filepath).toLowerCase();
  return (
    fileTypeMappingsConfig.FILENAME_TO_CANONICAL_TYPE_MAPPINGS.has(filename) ||
    fileTypeMappingsConfig.FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS.has(detectedType.toLowerCase())
  );
}
