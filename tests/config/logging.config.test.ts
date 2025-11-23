import { loggingConfig } from "../../src/llm/tracking/logging.config";

describe("logging.config", () => {
  describe("ERROR_LOG_DIRECTORY", () => {
    it("should have a defined error log directory", () => {
      expect(loggingConfig.ERROR_LOG_DIRECTORY).toBeDefined();
      expect(typeof loggingConfig.ERROR_LOG_DIRECTORY).toBe("string");
    });

    it("should point to output/errors directory", () => {
      expect(loggingConfig.ERROR_LOG_DIRECTORY).toBe("output/errors");
    });
  });

  describe("ERROR_LOG_FILENAME_TEMPLATE", () => {
    it("should have a defined filename template", () => {
      expect(loggingConfig.ERROR_LOG_FILENAME_TEMPLATE).toBeDefined();
      expect(typeof loggingConfig.ERROR_LOG_FILENAME_TEMPLATE).toBe("string");
    });

    it("should contain timestamp placeholder", () => {
      expect(loggingConfig.ERROR_LOG_FILENAME_TEMPLATE).toContain("{timestamp}");
    });

    it("should have .log extension", () => {
      expect(loggingConfig.ERROR_LOG_FILENAME_TEMPLATE).toMatch(/\.log$/);
    });
  });
});
