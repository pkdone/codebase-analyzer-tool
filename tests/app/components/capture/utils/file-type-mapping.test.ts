/**
 * Tests for the file type mapping utility.
 * Validates the getCanonicalFileType function which uses the file type registry.
 */
import "reflect-metadata";
import { getCanonicalFileType } from "../../../../../src/app/components/capture/utils/file-type-mapping";
import {
  FILENAME_TYPE_REGISTRY,
  deriveExtensionToTypeMap,
} from "../../../../../src/app/config/file-handling/file-type-registry";

describe("getCanonicalFileType", () => {
  describe("extension-based mapping", () => {
    it("should map Java extensions to java canonical type", () => {
      expect(getCanonicalFileType("/path/to/File.java", "java")).toBe("java");
      expect(getCanonicalFileType("/path/to/File.kt", "kt")).toBe("java");
      expect(getCanonicalFileType("/path/to/File.scala", "scala")).toBe("java");
    });

    it("should map JavaScript/TypeScript extensions to javascript canonical type", () => {
      expect(getCanonicalFileType("/path/to/file.js", "js")).toBe("javascript");
      expect(getCanonicalFileType("/path/to/file.ts", "ts")).toBe("javascript");
      expect(getCanonicalFileType("/path/to/file.tsx", "tsx")).toBe("javascript");
      expect(getCanonicalFileType("/path/to/file.jsx", "jsx")).toBe("javascript");
    });

    it("should map Python extensions correctly", () => {
      expect(getCanonicalFileType("/path/to/file.py", "py")).toBe("python");
    });

    it("should map C/C++ extensions correctly", () => {
      expect(getCanonicalFileType("/path/to/file.c", "c")).toBe("c");
      expect(getCanonicalFileType("/path/to/file.h", "h")).toBe("c");
      expect(getCanonicalFileType("/path/to/file.cpp", "cpp")).toBe("cpp");
      expect(getCanonicalFileType("/path/to/file.hpp", "hpp")).toBe("cpp");
    });

    it("should handle additional type aliases", () => {
      // These are aliases that map type strings (not file extensions) to canonical types
      expect(getCanonicalFileType("/path/to/file.js", "javascript")).toBe("javascript");
      expect(getCanonicalFileType("/path/to/file.ts", "typescript")).toBe("javascript");
      expect(getCanonicalFileType("/path/to/file.rb", "ruby")).toBe("ruby");
      expect(getCanonicalFileType("/path/to/file.cs", "csharp")).toBe("csharp");
    });
  });

  describe("filename-based mapping", () => {
    it("should map Maven build files correctly", () => {
      expect(getCanonicalFileType("/path/to/pom.xml", "xml")).toBe("maven");
    });

    it("should map Gradle build files correctly", () => {
      expect(getCanonicalFileType("/path/to/build.gradle", "gradle")).toBe("gradle");
      expect(getCanonicalFileType("/path/to/build.gradle.kts", "kts")).toBe("gradle");
    });

    it("should map npm files correctly", () => {
      expect(getCanonicalFileType("/path/to/package.json", "json")).toBe("npm");
      expect(getCanonicalFileType("/path/to/yarn.lock", "lock")).toBe("npm");
    });

    it("should map Python build files correctly", () => {
      expect(getCanonicalFileType("/path/to/requirements.txt", "txt")).toBe("python-pip");
      expect(getCanonicalFileType("/path/to/setup.py", "py")).toBe("python-setup");
      expect(getCanonicalFileType("/path/to/pyproject.toml", "toml")).toBe("python-poetry");
    });

    it("should map C/C++ build files correctly", () => {
      expect(getCanonicalFileType("/path/to/CMakeLists.txt", "txt")).toBe("makefile");
      expect(getCanonicalFileType("/path/to/Makefile", "")).toBe("makefile");
    });

    it("should be case-insensitive for filenames", () => {
      expect(getCanonicalFileType("/path/to/POM.XML", "xml")).toBe("maven");
      expect(getCanonicalFileType("/path/to/PACKAGE.JSON", "json")).toBe("npm");
    });
  });

  describe("rule-based mapping (complex patterns)", () => {
    it("should map README files to markdown", () => {
      expect(getCanonicalFileType("/path/to/README", "")).toBe("markdown");
      expect(getCanonicalFileType("/path/to/README.md", "md")).toBe("markdown");
      expect(getCanonicalFileType("/path/to/readme.txt", "txt")).toBe("markdown");
    });

    it("should map LICENSE files to markdown", () => {
      expect(getCanonicalFileType("/path/to/LICENSE", "")).toBe("markdown");
      expect(getCanonicalFileType("/path/to/license.md", "md")).toBe("markdown");
    });

    it("should map CHANGELOG files to markdown", () => {
      expect(getCanonicalFileType("/path/to/CHANGELOG", "")).toBe("markdown");
      expect(getCanonicalFileType("/path/to/changelog.md", "md")).toBe("markdown");
    });

    it("should map Makefile variants to makefile", () => {
      expect(getCanonicalFileType("/path/to/Makefile.am", "am")).toBe("makefile");
      expect(getCanonicalFileType("/path/to/Makefile.in", "in")).toBe("makefile");
    });
  });

  describe("default fallback", () => {
    it("should return default for unknown extensions", () => {
      expect(getCanonicalFileType("/path/to/file.unknown", "unknown")).toBe("default");
    });

    it("should return default for unknown filenames", () => {
      expect(getCanonicalFileType("/path/to/randomfile", "")).toBe("default");
    });
  });

  describe("integration with file-type-registry", () => {
    it("should correctly use all filename mappings from FILENAME_TYPE_REGISTRY", () => {
      // Verify that each filename in the registry returns the correct type
      for (const [filename, expectedType] of Object.entries(FILENAME_TYPE_REGISTRY)) {
        const result = getCanonicalFileType(`/path/to/${filename}`, "");
        expect(result).toBe(expectedType);
      }
    });

    it("should correctly use extension mappings from deriveExtensionToTypeMap", () => {
      const extensionMap = deriveExtensionToTypeMap();
      // Test a sample of extensions
      const testExtensions = ["java", "ts", "py", "rb", "cs", "c", "cpp", "sql"];
      for (const ext of testExtensions) {
        const expectedType = extensionMap[ext];
        const result = getCanonicalFileType(`/path/to/file.${ext}`, ext);
        expect(result).toBe(expectedType);
      }
    });
  });
});
