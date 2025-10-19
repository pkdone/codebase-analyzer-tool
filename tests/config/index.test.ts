import * as configExports from "../../src/config/index";
import { appConfig } from "../../src/config/app.config";
import { databaseConfig } from "../../src/config/database.config";
import { fileProcessingConfig } from "../../src/config/file-processing.config";
import { fileTypesToCanonicalMappings } from "../../src/promptTemplates/prompt.types";
import { outputConfig } from "../../src/config/output.config";
import { ERROR_LOG_DIRECTORY, ERROR_LOG_FILENAME_TEMPLATE } from "../../src/config/logging.config";

describe("config/index", () => {
  describe("exports all configuration modules", () => {
    it("should export appConfig", () => {
      expect(configExports.appConfig).toBeDefined();
      expect(configExports.appConfig).toBe(appConfig);
    });

    it("should export databaseConfig", () => {
      expect(configExports.databaseConfig).toBeDefined();
      expect(configExports.databaseConfig).toBe(databaseConfig);
    });

    it("should export fileProcessingConfig", () => {
      expect(configExports.fileProcessingConfig).toBeDefined();
      expect(configExports.fileProcessingConfig).toBe(fileProcessingConfig);
    });

    it("should export fileTypesToCanonicalMappings", () => {
      expect(configExports.fileTypesToCanonicalMappings).toBeDefined();
      expect(configExports.fileTypesToCanonicalMappings).toBe(fileTypesToCanonicalMappings);
    });

    it("should export outputConfig", () => {
      expect(configExports.outputConfig).toBeDefined();
      expect(configExports.outputConfig).toBe(outputConfig);
    });

    it("should export ERROR_LOG_DIRECTORY", () => {
      expect(configExports.ERROR_LOG_DIRECTORY).toBeDefined();
      expect(configExports.ERROR_LOG_DIRECTORY).toBe(ERROR_LOG_DIRECTORY);
    });

    it("should export ERROR_LOG_FILENAME_TEMPLATE", () => {
      expect(configExports.ERROR_LOG_FILENAME_TEMPLATE).toBeDefined();
      expect(configExports.ERROR_LOG_FILENAME_TEMPLATE).toBe(ERROR_LOG_FILENAME_TEMPLATE);
    });
  });

  describe("config consistency", () => {
    it("should export at least 7 config items", () => {
      const exportedKeys = Object.keys(configExports);
      expect(exportedKeys.length).toBeGreaterThanOrEqual(7);
    });

    it("should not export any undefined values", () => {
      const exportedValues = Object.values(configExports);
      for (const value of exportedValues) {
        expect(value).toBeDefined();
      }
    });
  });
});
