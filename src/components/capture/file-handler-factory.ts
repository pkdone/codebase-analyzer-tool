import { injectable } from "tsyringe";
import { DynamicPromptConfig } from "../../llm/utils/prompt-templator";
import { fileTypeMetadataConfig } from "./files-types-metadata.config";
import { resolveFileType } from "../../common/utils/file-type-resolver";

/**
 * Factory class responsible for creating appropriate prompt configurations based on file type.
 * This class encapsulates the logic for determining file types and mapping them to configurations.
 */
@injectable()
export class PromptConfigFactory {
  /**
   * Creates a DynamicPromptConfig for the given file path and type.
   *
   * @param filepath - The path to the file being processed
   * @param type - The detected file type
   * @returns A DynamicPromptConfig configured for the specific file type
   */
  createConfig(filepath: string, type: string): DynamicPromptConfig {
    const resolvedFileType = resolveFileType(filepath, type);
    const config = this.getConfigForFileType(resolvedFileType);
    return config;
  }

  /**
   * Gets the configuration for a specific file type.
   *
   * @param fileType - The canonical file type
   * @returns The configuration object for the file type
   */
  private getConfigForFileType(fileType: string) {
    return fileTypeMetadataConfig[fileType] ?? fileTypeMetadataConfig.default;
  }
}
