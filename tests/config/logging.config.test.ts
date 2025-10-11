import { ERROR_LOG_DIRECTORY, ERROR_LOG_FILENAME_TEMPLATE } from "../../src/config/logging.config";

describe("logging.config", () => {
  describe("ERROR_LOG_DIRECTORY", () => {
    it("should have a defined error log directory", () => {
      expect(ERROR_LOG_DIRECTORY).toBeDefined();
      expect(typeof ERROR_LOG_DIRECTORY).toBe("string");
    });

    it("should point to output/errors directory", () => {
      expect(ERROR_LOG_DIRECTORY).toBe("output/errors");
    });
  });

  describe("ERROR_LOG_FILENAME_TEMPLATE", () => {
    it("should have a defined filename template", () => {
      expect(ERROR_LOG_FILENAME_TEMPLATE).toBeDefined();
      expect(typeof ERROR_LOG_FILENAME_TEMPLATE).toBe("string");
    });

    it("should contain timestamp placeholder", () => {
      expect(ERROR_LOG_FILENAME_TEMPLATE).toContain("{timestamp}");
    });

    it("should have .log extension", () => {
      expect(ERROR_LOG_FILENAME_TEMPLATE).toMatch(/\.log$/);
    });
  });
});

