/**
 * Tests for capture module barrel exports.
 * Validates that the index.ts exports are working correctly.
 */
import "reflect-metadata";
import * as CaptureModule from "../../../../src/app/components/capture";

describe("capture module barrel exports", () => {
  describe("core services", () => {
    it("should export CodebaseToDBLoader", () => {
      expect(CaptureModule.CodebaseToDBLoader).toBeDefined();
      expect(typeof CaptureModule.CodebaseToDBLoader).toBe("function");
    });

    it("should export FileSummarizerService", () => {
      expect(CaptureModule.FileSummarizerService).toBeDefined();
      expect(typeof CaptureModule.FileSummarizerService).toBe("function");
    });
  });

  describe("configuration exports", () => {
    it("should export getCanonicalFileType function", () => {
      expect(CaptureModule.getCanonicalFileType).toBeDefined();
      expect(typeof CaptureModule.getCanonicalFileType).toBe("function");
    });

    it("should export CANONICAL_FILE_TYPES", () => {
      expect(CaptureModule.CANONICAL_FILE_TYPES).toBeDefined();
      expect(Array.isArray(CaptureModule.CANONICAL_FILE_TYPES)).toBe(true);
    });

    it("should include expected canonical file types", () => {
      const types = CaptureModule.CANONICAL_FILE_TYPES;
      expect(types).toContain("java");
      expect(types).toContain("javascript");
      expect(types).toContain("python");
    });
  });

  describe("getCanonicalFileType function", () => {
    it("should return canonical type for known extensions", () => {
      // getCanonicalFileType takes (filepath, extension) arguments
      expect(CaptureModule.getCanonicalFileType("Test.java", "java")).toBe("java");
      expect(CaptureModule.getCanonicalFileType("app.ts", "ts")).toBe("javascript");
      expect(CaptureModule.getCanonicalFileType("script.py", "py")).toBe("python");
    });

    it("should return default for unknown extensions", () => {
      expect(CaptureModule.getCanonicalFileType("unknown.xyz", "xyz")).toBe("default");
    });
  });
});

