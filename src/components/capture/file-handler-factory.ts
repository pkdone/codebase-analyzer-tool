import path from "path";
import { injectable } from "tsyringe";
import { FileHandler } from "./file-handler";
import { filesTypeMetatadataConfig } from "./files-types-metadata.config";
import { appConfig } from "../../config/app.config";

/**
 * Factory class responsible for creating appropriate FileHandler instances based on file type.
 * This class encapsulates the logic for determining file types and mapping them to configurations.
 */
@injectable()
export class FileHandlerFactory {
  /**
   * Creates a FileHandler for the given file path and type.
   *
   * @param filepath - The path to the file being processed
   * @param type - The detected file type
   * @returns A FileHandler configured for the specific file type
   */
  createHandler(filepath: string, type: string): FileHandler {
    const resolvedFileType = this.resolveFileType(filepath, type);
    const config = this.getConfigForFileType(resolvedFileType);
    return new FileHandler(config);
  }

  /**
   * Resolves the canonical file type based on filepath and detected type.
   * Handles special filename cases and type mappings.
   *
   * @param filepath - The path to the file
   * @param type - The initially detected file type
   * @returns The resolved canonical file type
   */
  private resolveFileType(filepath: string, type: string): string {
    const filename = path.basename(filepath).toLowerCase();

    // Check if this specific filename has a canonical type mapping
    const canonicalType = appConfig.FILENAME_TO_CANONICAL_TYPE_MAPPINGS.get(filename);
    if (canonicalType) {
      return canonicalType;
    }

    // Use the suffix-based mapping to determine the canonical type
    return (
      appConfig.FILE_SUFFIX_TO_CANONICAL_TYPE_MAPPINGS.get(type.toLowerCase()) ??
      appConfig.DEFAULT_FILE_TYPE
    );
  }

  /**
   * Gets the configuration for a specific file type.
   *
   * @param fileType - The canonical file type
   * @returns The configuration object for the file type
   */
  private getConfigForFileType(fileType: string) {
    return filesTypeMetatadataConfig[fileType] ?? filesTypeMetatadataConfig.default;
  }
}
