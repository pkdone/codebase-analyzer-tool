import path from "node:path";

/**
 * Configuration interface for file type mapping
 */
export interface FileTypeMappingsConfig {
  readonly FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS: ReadonlyMap<string, string>;
  readonly FILENAME_TO_CANONICAL_TYPE_MAPPINGS: ReadonlyMap<string, string>;
  readonly DEFAULT_FILE_TYPE: string;
}

/**
 * Resolves the canonical file type based on filepath and detected type.
 * Handles special filename cases and type mappings.
 *
 * @param filepath - The path to the file
 * @param detectedType - The initially detected file type (usually from extension)
 * @param config - The file type mappings configuration
 * @returns The resolved canonical file type
 */
export function resolveFileType(
  filepath: string,
  detectedType: string,
  config: FileTypeMappingsConfig,
): string {
  const filename = path.basename(filepath).toLowerCase();

  // Check if this specific filename has a canonical type mapping
  const canonicalType = config.FILENAME_TO_CANONICAL_TYPE_MAPPINGS.get(filename);
  if (canonicalType) return canonicalType;

  // Use the extension-based mapping to determine the canonical type
  return (
    config.FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS.get(detectedType.toLowerCase()) ??
    config.DEFAULT_FILE_TYPE
  );
}
