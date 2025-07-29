import "reflect-metadata";
import { jest } from "@jest/globals";
import { FileHandlerFactory } from "../../../src/components/capture/file-handler-factory";
import { FileHandler } from "../../../src/components/capture/file-handler";
import { fileTypeMetadataConfig } from "../../../src/components/capture/files-types-metadata.config";

// Mock the file-handler module
jest.mock("../../../src/components/capture/file-handler", () => ({
  FileHandler: jest.fn().mockImplementation((config) => ({
    config,
    mockFileHandler: true,
  })),
}));

// Mock the app config module
jest.mock("../../../src/config/app.config", () => ({
  appConfig: {
    FILENAME_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, string>([
      ["readme", "markdown"],
      ["license", "markdown"],
      ["changelog", "markdown"],
      ["package.json", "javascript"],
    ]),
    FILE_EXTENSION_TO_CANONICAL_TYPE_MAPPINGS: new Map<string, string>([
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
    DEFAULT_FILE_TYPE: "default",
  },
}));

describe("FileHandlerFactory", () => {
  let factory: FileHandlerFactory;
  let mockFileHandler: jest.Mocked<typeof FileHandler>;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new FileHandlerFactory();
    mockFileHandler = FileHandler as jest.Mocked<typeof FileHandler>;
  });

  describe("createHandler", () => {
    it("should create a FileHandler with the correct configuration", () => {
      const filepath = "/path/to/file.java";
      const type = "java";

      const handler = factory.createHandler(filepath, type);

      expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.java);
      expect(handler).toBeDefined();
    });

    it("should resolve file type correctly and create handler", () => {
      const filepath = "/src/main/MyClass.java";
      const type = "java";

      factory.createHandler(filepath, type);

      expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.java);
    });
  });

  describe("file type resolution", () => {
    describe("filename-based resolution", () => {
      it("should resolve README file to markdown type", () => {
        const filepath = "/project/README";
        const type = "unknown";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.markdown);
      });

      it("should resolve LICENSE file to markdown type", () => {
        const filepath = "/project/LICENSE";
        const type = "txt";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.markdown);
      });

      it("should resolve CHANGELOG file to markdown type", () => {
        const filepath = "/docs/CHANGELOG";
        const type = "unknown";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.markdown);
      });

      it("should be case insensitive for filename resolution", () => {
        const filepath = "/project/README.md";
        const type = "md";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.markdown);
      });

      it("should prioritize filename mapping over extension mapping", () => {
        // package.json should resolve to 'javascript' via filename mapping,
        // not 'default' via unknown extension
        const filepath = "/project/package.json";
        const type = "json";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.javascript);
      });
    });

    describe("extension-based resolution", () => {
      it("should resolve Java files correctly", () => {
        const filepath = "/src/main/java/com/example/MyClass.java";
        const type = "java";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.java);
      });

      it("should resolve JavaScript files correctly", () => {
        const cases = [
          { filepath: "/src/index.js", type: "js" },
          { filepath: "/src/component.ts", type: "ts" },
          { filepath: "/src/module.javascript", type: "javascript" },
          { filepath: "/src/types.typescript", type: "typescript" },
        ];

        cases.forEach(({ filepath, type }) => {
          jest.clearAllMocks();
          factory.createHandler(filepath, type);
          expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.javascript);
        });
      });

      it("should resolve SQL files correctly", () => {
        const cases = [
          { filepath: "/database/schema.sql", type: "sql" },
          { filepath: "/database/tables.ddl", type: "ddl" },
        ];

        cases.forEach(({ filepath, type }) => {
          jest.clearAllMocks();
          factory.createHandler(filepath, type);
          expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.sql);
        });
      });

      it("should resolve XML files correctly", () => {
        const filepath = "/config/web.xml";
        const type = "xml";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.xml);
      });

      it("should resolve JSP files correctly", () => {
        const filepath = "/webapp/index.jsp";
        const type = "jsp";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.jsp);
      });

      it("should resolve Markdown files correctly", () => {
        const cases = [
          { filepath: "/docs/api.md", type: "md" },
          { filepath: "/docs/guide.markdown", type: "markdown" },
        ];

        cases.forEach(({ filepath, type }) => {
          jest.clearAllMocks();
          factory.createHandler(filepath, type);
          expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.markdown);
        });
      });

      it("should be case insensitive for extension resolution", () => {
        const filepath = "/src/MyClass.JAVA";
        const type = "JAVA";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.java);
      });
    });

    describe("default type resolution", () => {
      it("should use default type for unknown extensions", () => {
        const filepath = "/config/settings.ini";
        const type = "ini";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.default);
      });

      it("should use default type for files with no extension", () => {
        const filepath = "/scripts/build";
        const type = "";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.default);
      });

      it("should use default type for unknown file types", () => {
        const filepath = "/data/sample.csv";
        const type = "csv";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.default);
      });

      it("should use mapped default type for known extensions", () => {
        const filepath = "/scripts/main.py";
        const type = "py";

        factory.createHandler(filepath, type);

        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.default);
      });
    });
  });

  describe("edge cases", () => {
    it("should handle files with multiple dots in filename", () => {
      const filepath = "/config/app.config.js";
      const type = "js";

      factory.createHandler(filepath, type);

      expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.javascript);
    });

    it("should handle files in nested directories", () => {
      const filepath = "/very/deep/nested/path/to/file.java";
      const type = "java";

      factory.createHandler(filepath, type);

      expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.java);
    });

    it("should handle absolute vs relative paths consistently", () => {
      const cases = [
        "/absolute/path/file.java",
        "relative/path/file.java",
        "./relative/path/file.java",
        "../relative/path/file.java",
      ];

      cases.forEach((filepath) => {
        jest.clearAllMocks();
        factory.createHandler(filepath, "java");
        expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.java);
      });
    });

    it("should handle empty strings gracefully", () => {
      const filepath = "";
      const type = "";

      factory.createHandler(filepath, type);

      expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.default);
    });

    it("should handle special characters in filenames", () => {
      const filepath = "/path/to/my-file_name.with-special chars.js";
      const type = "js";

      factory.createHandler(filepath, type);

      expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.javascript);
    });

    it("should handle files with uppercase extensions", () => {
      const filepath = "/src/Component.TS";
      const type = "TS";

      factory.createHandler(filepath, type);

      expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.javascript);
    });
  });

  describe("configuration retrieval", () => {
    it("should fall back to default config for unmapped file types", () => {
      const filepath = "/unknown/file.xyz";
      const type = "xyz";

      factory.createHandler(filepath, type);

      expect(mockFileHandler).toHaveBeenCalledWith(fileTypeMetadataConfig.default);
    });

    it("should return correct config for each file type", () => {
      const testCases = [
        { path: "/test.java", type: "java", expectedConfig: fileTypeMetadataConfig.java },
        { path: "/test.js", type: "js", expectedConfig: fileTypeMetadataConfig.javascript },
        { path: "/test.sql", type: "sql", expectedConfig: fileTypeMetadataConfig.sql },
        { path: "/test.xml", type: "xml", expectedConfig: fileTypeMetadataConfig.xml },
        { path: "/test.jsp", type: "jsp", expectedConfig: fileTypeMetadataConfig.jsp },
        { path: "/test.md", type: "md", expectedConfig: fileTypeMetadataConfig.markdown },
        { path: "/test.txt", type: "txt", expectedConfig: fileTypeMetadataConfig.default },
      ];

      testCases.forEach(({ path, type, expectedConfig }) => {
        jest.clearAllMocks();
        factory.createHandler(path, type);
        expect(mockFileHandler).toHaveBeenCalledWith(expectedConfig);
      });
    });
  });
}); 