// Import all configurations from the split modules
import { fileProcessingConfig } from "./file-processing.config";
import { fileTypeMappingsConfig } from "./file-type-mappings.config";
import { vectorSearchConfig } from "./vector-search.config";
import { outputConfig } from "./output.config";
import { llmProviderConfig } from "./llm-provider.config";
import { pathsConfig } from "./paths.config";

// Re-export all configurations for individual use
export { fileProcessingConfig } from "./file-processing.config";
export { fileTypeMappingsConfig } from "./file-type-mappings.config";
export { vectorSearchConfig } from "./vector-search.config";
export { outputConfig } from "./output.config";
export { llmProviderConfig } from "./llm-provider.config";
export { pathsConfig } from "./paths.config";

/**
 * Legacy combined configuration for backward compatibility
 * Consider using the specific config modules for new code
 */
export const appConfig = {
  ...fileProcessingConfig,
  ...fileTypeMappingsConfig,
  ...vectorSearchConfig,
  ...outputConfig,
  ...llmProviderConfig,
  ...pathsConfig,
} as const;
