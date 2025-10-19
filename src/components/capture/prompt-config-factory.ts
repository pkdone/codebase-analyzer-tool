import { injectable, inject } from "tsyringe";
import { SourcePromptTemplate } from "../../promptTemplates/prompt.types";
import { fileTypeMetadataConfig } from "../../promptTemplates/sources.prompts";
import { resolveFileType, type FileTypeMappingsConfig } from "./file-type-resolver";
import { TOKENS } from "../../tokens";

/**
 * Factory class responsible for creating appropriate prompt configurations based on file type.
 * This class encapsulates the logic for determining file types and mapping them to configurations.
 */
@injectable()
export class PromptConfigFactory {
  constructor(
    @inject(TOKENS.FileTypeMappingsConfig)
    private readonly fileTypeMappingsConfig: FileTypeMappingsConfig,
  ) {}

  /**
   * Creates a DynamicPromptConfig for the given file path and type.
   *
   * @param filepath - The path to the file being processed
   * @param type - The detected file type
   * @returns A DynamicPromptConfig configured for the specific file type
   */
  createConfig(filepath: string, type: string): SourcePromptTemplate {
    const resolvedFileType = resolveFileType(filepath, type, this.fileTypeMappingsConfig);
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
    // Type assertion is safe here because we check if the key exists and fallback to default
    return (
      (fileTypeMetadataConfig as Record<string, SourcePromptTemplate>)[fileType] ??
      fileTypeMetadataConfig.default
    );
  }
}
