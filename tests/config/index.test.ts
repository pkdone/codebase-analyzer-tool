import { appConfig } from "../../src/config/app.config";
import { databaseConfig } from "../../src/config/database.config";
import { fileProcessingConfig } from "../../src/config/file-processing.config";
import { fileTypeMappingsConfig } from "../../src/config/file-type-mappings.config";
import { outputConfig } from "../../src/config/output.config";
import { loggingConfig } from "../../src/config/logging.config";

describe("individual config modules", () => {
  it("appConfig should expose expected keys", () => {
    expect(appConfig).toBeDefined();
    expect(appConfig).toHaveProperty("UTF8_ENCODING");
    expect(appConfig).toHaveProperty("MIME_TYPE_JSON");
  });

  it("databaseConfig should expose collection names", () => {
    expect(databaseConfig).toBeDefined();
    expect(databaseConfig).toHaveProperty("SOURCES_COLLECTION_NAME");
    expect(databaseConfig).toHaveProperty("SUMMARIES_COLLECTION_NAME");
  });

  it("fileProcessingConfig should expose ignore lists", () => {
    expect(fileProcessingConfig).toBeDefined();
    expect(fileProcessingConfig).toHaveProperty("FOLDER_IGNORE_LIST");
    expect(fileProcessingConfig).toHaveProperty("BINARY_FILE_EXTENSION_IGNORE_LIST");
  });

  it("JAVA_FILE_TYPE constant should be defined", () => {
    expect(fileTypeMappingsConfig.JAVA_FILE_TYPE).toBe("java");
  });

  it("outputConfig should expose output directory", () => {
    expect(outputConfig).toBeDefined();
    expect(outputConfig).toHaveProperty("OUTPUT_DIR");
  });

  it("logging config constants should be defined", () => {
    expect(loggingConfig.ERROR_LOG_DIRECTORY).toBeDefined();
    expect(loggingConfig.ERROR_LOG_FILENAME_TEMPLATE).toBeDefined();
  });
});
