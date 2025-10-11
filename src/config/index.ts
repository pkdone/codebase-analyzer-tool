/**
 * Central export point for all configuration modules.
 * This provides a convenient way to import multiple configs at once.
 */

export { appConfig } from "./app.config";
export { databaseConfig } from "./database.config";
export { fileProcessingConfig } from "./file-processing.config";
export { fileTypeMappingsConfig } from "./file-type-mappings.config";
export { insightsTuningConfig, summaryCategoriesConfig } from "./insights.config";
export { outputConfig } from "./output.config";
export { ERROR_LOG_DIRECTORY, ERROR_LOG_FILENAME_TEMPLATE } from "./logging.config";

