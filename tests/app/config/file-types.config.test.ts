import {
  CANONICAL_FILE_TYPES,
  canonicalFileTypeSchema,
  type CanonicalFileType,
} from "../../../src/app/schemas/canonical-file-types";
import { getCanonicalFileType } from "../../../src/app/config/file-handling";

describe("file-types.config", () => {
  describe("CANONICAL_FILE_TYPES", () => {
    it("should be defined as a readonly array", () => {
      expect(CANONICAL_FILE_TYPES).toBeDefined();
      expect(Array.isArray(CANONICAL_FILE_TYPES)).toBe(true);
    });

    it("should contain expected file types", () => {
      const expectedTypes = [
        "java",
        "javascript",
        "default",
        "sql",
        "xml",
        "jsp",
        "markdown",
        "csharp",
        "ruby",
        "python",
      ];

      for (const type of expectedTypes) {
        expect(CANONICAL_FILE_TYPES).toContain(type);
      }
    });

    it("should have default type", () => {
      expect(CANONICAL_FILE_TYPES).toContain("default");
      // Note: default appears twice in the array, which is intentional
      const defaultCount = CANONICAL_FILE_TYPES.filter((t) => t === "default").length;
      expect(defaultCount).toBeGreaterThanOrEqual(1);
    });

    it("should have build tool file types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("maven");
      expect(CANONICAL_FILE_TYPES).toContain("gradle");
      expect(CANONICAL_FILE_TYPES).toContain("ant");
      expect(CANONICAL_FILE_TYPES).toContain("npm");
    });

    it("should have package manager file types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("nuget");
      expect(CANONICAL_FILE_TYPES).toContain("ruby-bundler");
      expect(CANONICAL_FILE_TYPES).toContain("python-pip");
      expect(CANONICAL_FILE_TYPES).toContain("python-setup");
      expect(CANONICAL_FILE_TYPES).toContain("python-poetry");
    });

    it("should have C and C++ file types", () => {
      expect(CANONICAL_FILE_TYPES).toContain("c");
      expect(CANONICAL_FILE_TYPES).toContain("cpp");
      expect(CANONICAL_FILE_TYPES).toContain("makefile");
    });
  });

  describe("CanonicalFileType", () => {
    it("should be a valid type that can be assigned from CANONICAL_FILE_TYPES", () => {
      const testType: CanonicalFileType = CANONICAL_FILE_TYPES[0];
      expect(testType).toBeDefined();
    });

    it("should accept all values from CANONICAL_FILE_TYPES", () => {
      for (const type of CANONICAL_FILE_TYPES) {
        const testType: CanonicalFileType = type;
        expect(testType).toBe(type);
      }
    });
  });

  describe("canonicalFileTypeSchema", () => {
    it("should be a Zod enum schema", () => {
      expect(canonicalFileTypeSchema).toBeDefined();
      expect(typeof canonicalFileTypeSchema.parse).toBe("function");
    });

    it("should validate all CANONICAL_FILE_TYPES", () => {
      for (const type of CANONICAL_FILE_TYPES) {
        expect(() => canonicalFileTypeSchema.parse(type)).not.toThrow();
        expect(canonicalFileTypeSchema.parse(type)).toBe(type);
      }
    });

    it("should reject invalid file types", () => {
      expect(() => canonicalFileTypeSchema.parse("invalid-type")).toThrow();
      expect(() => canonicalFileTypeSchema.parse("")).toThrow();
      expect(() => canonicalFileTypeSchema.parse(null)).toThrow();
      expect(() => canonicalFileTypeSchema.parse(undefined)).toThrow();
    });
  });

  describe("getCanonicalFileType", () => {
    it("should match exact filename mappings", () => {
      expect(getCanonicalFileType("/path/to/pom.xml", "xml")).toBe("maven");
      expect(getCanonicalFileType("/path/to/package.json", "json")).toBe("npm");
      expect(getCanonicalFileType("/path/to/build.gradle", "gradle")).toBe("gradle");
      expect(getCanonicalFileType("/path/to/build.gradle.kts", "kts")).toBe("gradle");
    });

    it("should match extension-based mappings", () => {
      expect(getCanonicalFileType("/path/to/file.java", "java")).toBe("java");
      expect(getCanonicalFileType("/path/to/file.kt", "kt")).toBe("java");
      expect(getCanonicalFileType("/path/to/file.ts", "ts")).toBe("javascript");
      expect(getCanonicalFileType("/path/to/file.py", "py")).toBe("python");
      expect(getCanonicalFileType("/path/to/file.rb", "rb")).toBe("ruby");
    });

    it("should match C language extensions", () => {
      expect(getCanonicalFileType("/path/to/file.c", "c")).toBe("c");
      expect(getCanonicalFileType("/path/to/file.h", "h")).toBe("c");
    });

    it("should match C++ language extensions", () => {
      expect(getCanonicalFileType("/path/to/file.cpp", "cpp")).toBe("cpp");
      expect(getCanonicalFileType("/path/to/file.cxx", "cxx")).toBe("cpp");
      expect(getCanonicalFileType("/path/to/file.cc", "cc")).toBe("cpp");
      expect(getCanonicalFileType("/path/to/file.hpp", "hpp")).toBe("cpp");
    });

    it("should match C/C++ build file filenames", () => {
      expect(getCanonicalFileType("/path/to/CMakeLists.txt", "txt")).toBe("makefile");
      expect(getCanonicalFileType("/path/to/Makefile", "")).toBe("makefile");
      expect(getCanonicalFileType("/path/to/GNUmakefile", "")).toBe("makefile");
      expect(getCanonicalFileType("/path/to/configure.ac", "ac")).toBe("makefile");
      expect(getCanonicalFileType("/path/to/configure.in", "in")).toBe("makefile");
    });

    it("should match pattern-based rules (readme*, license*, changelog*)", () => {
      expect(getCanonicalFileType("/path/to/readme", "")).toBe("markdown");
      expect(getCanonicalFileType("/path/to/readme.md", "md")).toBe("markdown");
      expect(getCanonicalFileType("/path/to/license", "")).toBe("markdown");
      expect(getCanonicalFileType("/path/to/license.txt", "txt")).toBe("markdown");
      expect(getCanonicalFileType("/path/to/changelog", "")).toBe("markdown");
      expect(getCanonicalFileType("/path/to/changelog.md", "md")).toBe("markdown");
    });

    it("should match Makefile.* patterns", () => {
      expect(getCanonicalFileType("/path/to/Makefile.am", "am")).toBe("makefile");
      expect(getCanonicalFileType("/path/to/Makefile.in", "in")).toBe("makefile");
    });

    it("should prioritize filename mappings over extension mappings", () => {
      // pom.xml should match maven (filename) not xml (extension)
      expect(getCanonicalFileType("/path/to/pom.xml", "xml")).toBe("maven");
      // Other .xml files should match xml extension
      expect(getCanonicalFileType("/path/to/config.xml", "xml")).toBe("xml");
    });

    it("should return default for unknown files", () => {
      expect(getCanonicalFileType("/path/to/unknown.xyz", "xyz")).toBe("default");
      expect(getCanonicalFileType("/path/to/file", "")).toBe("default");
    });

    it("should handle real-world file examples correctly", () => {
      expect(getCanonicalFileType("/project/pom.xml", "xml")).toBe("maven");
      expect(getCanonicalFileType("/project/build.gradle", "gradle")).toBe("gradle");
      expect(getCanonicalFileType("/project/package.json", "json")).toBe("npm");
      expect(getCanonicalFileType("/src/Main.java", "java")).toBe("java");
      expect(getCanonicalFileType("/src/index.ts", "ts")).toBe("javascript");
      expect(getCanonicalFileType("/README.md", "md")).toBe("markdown");
    });
  });
});
