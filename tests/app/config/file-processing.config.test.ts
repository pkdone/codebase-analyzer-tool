import { fileProcessingRules as fileProcessingConfig } from "../../../src/app/domain/file-types";

describe("file-processing.config", () => {
  describe("fileProcessingConfig", () => {
    it("should be defined", () => {
      expect(fileProcessingConfig).toBeDefined();
    });

    it("should have all required properties", () => {
      expect(fileProcessingConfig).toHaveProperty("FOLDER_IGNORE_LIST");
      expect(fileProcessingConfig).toHaveProperty("FILENAME_PREFIX_IGNORE");
      expect(fileProcessingConfig).toHaveProperty("BINARY_FILE_EXTENSION_IGNORE_LIST");
      expect(fileProcessingConfig).toHaveProperty("CODE_FILE_EXTENSIONS");
      expect(fileProcessingConfig).toHaveProperty("MAX_CONCURRENCY");
    });
  });

  describe("FOLDER_IGNORE_LIST", () => {
    it("should be a non-empty array", () => {
      expect(Array.isArray(fileProcessingConfig.FOLDER_IGNORE_LIST)).toBe(true);
      expect(fileProcessingConfig.FOLDER_IGNORE_LIST.length).toBeGreaterThan(0);
    });

    it("should include common folders to ignore", () => {
      expect(fileProcessingConfig.FOLDER_IGNORE_LIST).toContain(".git");
      expect(fileProcessingConfig.FOLDER_IGNORE_LIST).toContain("node_modules");
      expect(fileProcessingConfig.FOLDER_IGNORE_LIST).toContain("dist");
      expect(fileProcessingConfig.FOLDER_IGNORE_LIST).toContain("build");
    });

    it("should include the tests folder", () => {
      expect(fileProcessingConfig.FOLDER_IGNORE_LIST).toContain("tests");
    });
  });

  describe("FILENAME_PREFIX_IGNORE", () => {
    it("should be a non-empty string", () => {
      expect(typeof fileProcessingConfig.FILENAME_PREFIX_IGNORE).toBe("string");
      expect(fileProcessingConfig.FILENAME_PREFIX_IGNORE.length).toBeGreaterThan(0);
    });

    it("should have the expected value", () => {
      expect(fileProcessingConfig.FILENAME_PREFIX_IGNORE).toBe("test-");
    });
  });

  describe("BINARY_FILE_EXTENSION_IGNORE_LIST", () => {
    it("should be a non-empty array", () => {
      expect(Array.isArray(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST)).toBe(true);
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST.length).toBeGreaterThan(0);
    });

    it("should include common image formats", () => {
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("png");
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("jpg");
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("jpeg");
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("gif");
    });

    it("should include common archive formats", () => {
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("zip");
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("tar");
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("7z");
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("rar");
    });

    it("should include Java archive formats", () => {
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("jar");
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("war");
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("ear");
    });

    it("should include document formats", () => {
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("pdf");
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("doc");
      expect(fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST).toContain("docx");
    });
  });

  describe("CODE_FILE_EXTENSIONS", () => {
    it("should be a non-empty array", () => {
      expect(Array.isArray(fileProcessingConfig.CODE_FILE_EXTENSIONS)).toBe(true);
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS.length).toBeGreaterThan(0);
    });

    it("should include common programming language extensions", () => {
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("js");
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("ts");
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("java");
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("py");
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("rb");
    });

    it("should include TypeScript/JavaScript variants", () => {
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("jsx");
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("tsx");
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("mjs");
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("cjs");
    });

    it("should include C/C++ extensions", () => {
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("c");
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("h");
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("cpp");
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("hpp");
    });

    it("should include SQL extensions", () => {
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("sql");
      expect(fileProcessingConfig.CODE_FILE_EXTENSIONS).toContain("ddl");
    });
  });

  describe("MAX_CONCURRENCY", () => {
    it("should be a positive number", () => {
      expect(typeof fileProcessingConfig.MAX_CONCURRENCY).toBe("number");
      expect(fileProcessingConfig.MAX_CONCURRENCY).toBeGreaterThan(0);
    });

    it("should have a reasonable value for concurrency", () => {
      expect(fileProcessingConfig.MAX_CONCURRENCY).toBe(50);
    });
  });
});
