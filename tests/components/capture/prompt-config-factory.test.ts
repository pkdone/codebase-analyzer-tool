import "reflect-metadata";
import { jest } from "@jest/globals";
import { PromptConfigFactory } from "../../../src/components/capture/prompt-config-factory";
import { fileTypePromptMetadata } from "../../../src/promptTemplates/sources.prompts";
import type { CanonicalFileType } from "../../../src/promptTemplates/prompt.types";

// Mock the file type mappings config module
jest.mock("../../../src/promptTemplates/prompt.types", () => ({
  fileTypesToCanonicalMappings: {
    FILENAME_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, CanonicalFileType>([
      ["readme", "markdown"],
      ["license", "markdown"],
      ["changelog", "markdown"],
      ["package.json", "javascript"],
    ]),
    FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, CanonicalFileType>([
      ["java", "java"],
      ["js", "javascript"],
      ["ts", "javascript"],
      ["javascript", "javascript"],
      ["typescript", "javascript"],
      ["ddl", "sql"],
      ["sql", "sql"],
      ["xml", "xml"],
      ["jsp", "jsp"],
      ["markdown", "markdown"],
      ["md", "markdown"],
      ["py", "default"], // Python files default to 'default' type
    ]),
    DEFAULT_FILE_TYPE: "default" as CanonicalFileType,
    JAVA_FILE_TYPE: "java" as CanonicalFileType,
  },
}));

describe("PromptConfigFactory", () => {
  let factory: PromptConfigFactory;

  const mockFileTypeMappingsConfig = {
    FILENAME_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, CanonicalFileType>([
      ["readme", "markdown"],
      ["license", "markdown"],
      ["changelog", "markdown"],
      ["package.json", "javascript"],
    ]),
    FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, CanonicalFileType>([
      ["java", "java"],
      ["js", "javascript"],
      ["ts", "javascript"],
      ["javascript", "javascript"],
      ["typescript", "javascript"],
      ["ddl", "sql"],
      ["sql", "sql"],
      ["xml", "xml"],
      ["jsp", "jsp"],
      ["markdown", "markdown"],
      ["md", "markdown"],
      ["py", "default"],
    ]),
    DEFAULT_FILE_TYPE: "default" as CanonicalFileType,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new PromptConfigFactory(mockFileTypeMappingsConfig);
  });

  describe("createConfig", () => {
    it("should create a DynamicPromptConfig with the correct configuration", () => {
      const filepath = "/path/to/file.java";
      const type = "java";

      const config = factory.createConfig(filepath, type);

      expect(config).toEqual(fileTypePromptMetadata.java);
    });

    it("should resolve file type correctly and return config", () => {
      const filepath = "/src/main/MyClass.java";
      const type = "java";

      const config = factory.createConfig(filepath, type);

      expect(config).toEqual(fileTypePromptMetadata.java);
    });
  });

  describe("file type resolution", () => {
    describe("filename-based resolution", () => {
      it("should resolve README file to markdown type", () => {
        const filepath = "/project/README";
        const type = "unknown";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.markdown);
      });

      it("should resolve LICENSE file to markdown type", () => {
        const filepath = "/project/LICENSE";
        const type = "txt";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.markdown);
      });

      it("should resolve CHANGELOG file to markdown type", () => {
        const filepath = "/docs/CHANGELOG";
        const type = "unknown";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.markdown);
      });

      it("should be case insensitive for filename resolution", () => {
        const filepath = "/project/README.md";
        const type = "md";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.markdown);
      });

      it("should prioritize filename mapping over extension mapping", () => {
        // package.json should resolve to 'javascript' via filename mapping,
        // not 'default' via unknown extension
        const filepath = "/project/package.json";
        const type = "json";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.javascript);
      });
    });

    describe("extension-based resolution", () => {
      it("should resolve Java files correctly", () => {
        const filepath = "/src/main/java/com/example/MyClass.java";
        const type = "java";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.java);
      });

      it("should resolve JavaScript files correctly", () => {
        const cases = [
          { filepath: "/src/index.js", type: "js" },
          { filepath: "/src/component.ts", type: "ts" },
          { filepath: "/src/module.javascript", type: "javascript" },
          { filepath: "/src/types.typescript", type: "typescript" },
        ];

        for (const { filepath, type } of cases) {
          jest.clearAllMocks();
          const config = factory.createConfig(filepath, type);
          expect(config).toEqual(fileTypePromptMetadata.javascript);
        }
      });

      it("should resolve SQL files correctly", () => {
        const cases = [
          { filepath: "/database/schema.sql", type: "sql" },
          { filepath: "/database/tables.ddl", type: "ddl" },
        ];

        for (const { filepath, type } of cases) {
          jest.clearAllMocks();
          const config = factory.createConfig(filepath, type);
          expect(config).toEqual(fileTypePromptMetadata.sql);
        }
      });

      it("should resolve XML files correctly", () => {
        const filepath = "/config/web.xml";
        const type = "xml";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.xml);
      });

      it("should resolve JSP files correctly", () => {
        const filepath = "/webapp/index.jsp";
        const type = "jsp";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.jsp);
      });

      it("should resolve Markdown files correctly", () => {
        const cases = [
          { filepath: "/docs/api.md", type: "md" },
          { filepath: "/docs/guide.markdown", type: "markdown" },
        ];

        for (const { filepath, type } of cases) {
          jest.clearAllMocks();
          const config = factory.createConfig(filepath, type);
          expect(config).toEqual(fileTypePromptMetadata.markdown);
        }
      });

      it("should be case insensitive for extension resolution", () => {
        const filepath = "/src/MyClass.JAVA";
        const type = "JAVA";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.java);
      });
    });

    describe("default type resolution", () => {
      it("should use default type for unknown extensions", () => {
        const filepath = "/config/settings.ini";
        const type = "ini";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.default);
      });

      it("should use default type for files with no extension", () => {
        const filepath = "/scripts/build";
        const type = "";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.default);
      });

      it("should use default type for unknown file types", () => {
        const filepath = "/data/sample.csv";
        const type = "csv";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.default);
      });

      it("should use mapped default type for known extensions", () => {
        const filepath = "/scripts/main.py";
        const type = "py";

        const config = factory.createConfig(filepath, type);

        expect(config).toEqual(fileTypePromptMetadata.default);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle files with multiple dots in filename", () => {
      const filepath = "/config/app.config.js";
      const type = "js";

      const config = factory.createConfig(filepath, type);

      expect(config).toEqual(fileTypePromptMetadata.javascript);
    });

    it("should handle files in nested directories", () => {
      const filepath = "/very/deep/nested/path/to/file.java";
      const type = "java";

      const config = factory.createConfig(filepath, type);

      expect(config).toEqual(fileTypePromptMetadata.java);
    });

    it("should handle absolute vs relative paths consistently", () => {
      const cases = [
        "/absolute/path/file.java",
        "relative/path/file.java",
        "./relative/path/file.java",
        "../relative/path/file.java",
      ];

      for (const filepath of cases) {
        jest.clearAllMocks();
        const config = factory.createConfig(filepath, "java");
        expect(config).toEqual(fileTypePromptMetadata.java);
      }
    });

    it("should handle empty strings gracefully", () => {
      const filepath = "";
      const type = "";

      const config = factory.createConfig(filepath, type);

      expect(config).toEqual(fileTypePromptMetadata.default);
    });

    it("should handle special characters in filenames", () => {
      const filepath = "/path/to/my-file_name.with-special chars.js";
      const type = "js";

      const config = factory.createConfig(filepath, type);

      expect(config).toEqual(fileTypePromptMetadata.javascript);
    });

    it("should handle files with uppercase extensions", () => {
      const filepath = "/src/Component.TS";
      const type = "TS";

      const config = factory.createConfig(filepath, type);

      expect(config).toEqual(fileTypePromptMetadata.javascript);
    });
  });

  describe("configuration retrieval", () => {
    it("should fall back to default config for unmapped file types", () => {
      const filepath = "/unknown/file.xyz";
      const type = "xyz";

      const config = factory.createConfig(filepath, type);

      expect(config).toEqual(fileTypePromptMetadata.default);
    });

    it("should return correct config for each file type", () => {
      const testCases = [
        { path: "/test.java", type: "java", expectedConfig: fileTypePromptMetadata.java },
        { path: "/test.js", type: "js", expectedConfig: fileTypePromptMetadata.javascript },
        { path: "/test.sql", type: "sql", expectedConfig: fileTypePromptMetadata.sql },
        { path: "/test.xml", type: "xml", expectedConfig: fileTypePromptMetadata.xml },
        { path: "/test.jsp", type: "jsp", expectedConfig: fileTypePromptMetadata.jsp },
        { path: "/test.md", type: "md", expectedConfig: fileTypePromptMetadata.markdown },
        { path: "/test.txt", type: "txt", expectedConfig: fileTypePromptMetadata.default },
      ];

      for (const { path, type, expectedConfig } of testCases) {
        jest.clearAllMocks();
        const config = factory.createConfig(path, type);
        expect(config).toEqual(expectedConfig);
      }
    });
  });
});
