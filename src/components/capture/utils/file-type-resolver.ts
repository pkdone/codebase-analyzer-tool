import path from "path";
import { fileTypeMappingsConfig } from "../../../config/file-type-mappings.config";

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

