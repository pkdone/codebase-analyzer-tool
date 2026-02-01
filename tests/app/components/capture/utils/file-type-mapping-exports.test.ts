/**
 * Tests for the file type mapping utility exports.
 * Validates that getCanonicalFileType is correctly exported from capture utils.
 */
import "reflect-metadata";
import * as CaptureUtils from "../../../../../src/app/components/capture/utils";
import * as CaptureModule from "../../../../../src/app/components/capture";

describe("capture utils module exports", () => {
  it("should export getCanonicalFileType from utils", () => {
    expect(CaptureUtils.getCanonicalFileType).toBeDefined();
    expect(typeof CaptureUtils.getCanonicalFileType).toBe("function");
  });

  it("should export getCanonicalFileType from capture barrel", () => {
    expect(CaptureModule.getCanonicalFileType).toBeDefined();
    expect(typeof CaptureModule.getCanonicalFileType).toBe("function");
  });

  it("should be the same function from both exports", () => {
    expect(CaptureUtils.getCanonicalFileType).toBe(CaptureModule.getCanonicalFileType);
  });

  describe("getCanonicalFileType functionality", () => {
    it("should map Java file extensions correctly", () => {
      expect(CaptureModule.getCanonicalFileType("/path/to/File.java", "java")).toBe("java");
      expect(CaptureModule.getCanonicalFileType("/path/to/File.kt", "kt")).toBe("java");
    });

    it("should map JavaScript file extensions correctly", () => {
      expect(CaptureModule.getCanonicalFileType("/path/to/file.js", "js")).toBe("javascript");
      expect(CaptureModule.getCanonicalFileType("/path/to/file.ts", "ts")).toBe("javascript");
    });

    it("should handle build file filenames", () => {
      expect(CaptureModule.getCanonicalFileType("/path/to/pom.xml", "xml")).toBe("maven");
      expect(CaptureModule.getCanonicalFileType("/path/to/package.json", "json")).toBe("npm");
    });

    it("should return default for unknown types", () => {
      expect(CaptureModule.getCanonicalFileType("/path/to/file.unknown", "unknown")).toBe(
        "default",
      );
    });
  });
});
