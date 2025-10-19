import { appConfig } from "../../src/config/app.config";
import { databaseConfig } from "../../src/config/database.config";
import { fileProcessingConfig } from "../../src/config/file-processing.config";
import { fileTypesToCanonicalMappings } from "../../src/promptTemplates/prompt.types";
import { outputConfig } from "../../src/config/output.config";
import { ERROR_LOG_DIRECTORY, ERROR_LOG_FILENAME_TEMPLATE } from "../../src/config/logging.config";

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

  it("fileTypesToCanonicalMappings should map JAVA file type", () => {
    expect(fileTypesToCanonicalMappings).toBeDefined();
    expect(fileTypesToCanonicalMappings).toHaveProperty("JAVA_FILE_TYPE");
  });

  it("outputConfig should expose output directory", () => {
    expect(outputConfig).toBeDefined();
    expect(outputConfig).toHaveProperty("OUTPUT_DIR");
  });

  it("logging config constants should be defined", () => {
    expect(ERROR_LOG_DIRECTORY).toBeDefined();
    expect(ERROR_LOG_FILENAME_TEMPLATE).toBeDefined();
  });
});
