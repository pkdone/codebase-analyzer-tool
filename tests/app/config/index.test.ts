import { databaseConfig } from "../../../src/app/config/database.config";
import { fileProcessingConfig } from "../../../src/app/config/file-processing.config";
import { EXTENSION_TO_TYPE_MAP } from "../../../src/app/config/file-types.config";
import { outputConfig } from "../../../src/app/config/output.config";

describe("individual config modules", () => {
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

  it("file type mapping should include java type in extension map", () => {
    expect(EXTENSION_TO_TYPE_MAP.java).toBe("java");
    expect(EXTENSION_TO_TYPE_MAP.kt).toBe("java");
    expect(EXTENSION_TO_TYPE_MAP.kts).toBe("java");
  });

  it("outputConfig should expose output directory", () => {
    expect(outputConfig).toBeDefined();
    expect(outputConfig).toHaveProperty("OUTPUT_DIR");
  });
});
