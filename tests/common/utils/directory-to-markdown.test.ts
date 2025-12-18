import {
  formatDirectoryAsMarkdown,
  type DirectoryFormattingConfig,
} from "../../../src/common/utils/directory-to-markdown";
import { findFilesRecursively } from "../../../src/common/fs/directory-operations";
import { getFileExtension } from "../../../src/common/fs/path-utils";
import { readFile } from "../../../src/common/fs/file-operations";
import { fileProcessingConfig } from "../../../src/app/components/capture/config/file-processing.config";

// Mock dependencies
jest.mock("../../../src/common/fs/directory-operations");
jest.mock("../../../src/common/fs/path-utils");
jest.mock("../../../src/common/fs/file-operations");

describe("directory-to-markdown", () => {
  const mockFindFilesRecursively = findFilesRecursively as jest.MockedFunction<
    typeof findFilesRecursively
  >;
  const mockGetFileExtension = getFileExtension as jest.MockedFunction<typeof getFileExtension>;
  const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("formatDirectoryAsMarkdown", () => {
    it("should process a directory and generate markdown code blocks", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/file1.ts", "/test/project/file2.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("ts").mockReturnValueOnce("ts");
      mockReadFile.mockResolvedValueOnce("const x = 1;").mockResolvedValueOnce("var y = 2;");

      const config: DirectoryFormattingConfig = {
        folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
        filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      };
      const result = await formatDirectoryAsMarkdown(dirPath, config);

      expect(mockFindFilesRecursively).toHaveBeenCalledWith(
        dirPath,
        config.folderIgnoreList,
        config.filenameIgnorePrefix,
      );

      expect(result).toContain("``` file1.ts");
      expect(result).toContain("const x = 1;");
      expect(result).toContain("``` file2.ts");
      expect(result).toContain("var y = 2;");
    });

    it("should remove trailing slashes from the directory path", async () => {
      const dirPath = "/test/project/";
      mockFindFilesRecursively.mockResolvedValue([]);

      const config: DirectoryFormattingConfig = {
        folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
        filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      };
      await formatDirectoryAsMarkdown(dirPath, config);

      expect(mockFindFilesRecursively).toHaveBeenCalledWith(
        "/test/project",
        config.folderIgnoreList,
        config.filenameIgnorePrefix,
      );
    });

    it("should skip binary files based on ignore list", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/image.png", "/test/project/code.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("png").mockReturnValueOnce("ts");
      mockReadFile.mockResolvedValueOnce("const x = 1;"); // Only called for .ts file

      const config: DirectoryFormattingConfig = {
        folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
        filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      };
      const result = await formatDirectoryAsMarkdown(dirPath, config);

      expect(mockReadFile).toHaveBeenCalledTimes(1);
      expect(result).not.toContain("image.png");
      expect(result).toContain("code.ts");
    });

    it("should handle uppercase file extensions", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/image.PNG"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("PNG");

      const config: DirectoryFormattingConfig = {
        folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
        filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      };
      const result = await formatDirectoryAsMarkdown(dirPath, config);

      expect(result).not.toContain("image.PNG");
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it("should trim file content in markdown blocks", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/file.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("ts");
      mockReadFile.mockResolvedValueOnce("  \n\nconst x = 1;\n\n  ");

      const config: DirectoryFormattingConfig = {
        folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
        filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      };
      const result = await formatDirectoryAsMarkdown(dirPath, config);

      expect(result).toContain("const x = 1;");
      expect(result).not.toMatch(/^\s+const x = 1;/);
      expect(result).not.toMatch(/const x = 1;\s+$/);
    });

    it("should use relative file paths in markdown blocks", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/src/utils/helper.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("ts");
      mockReadFile.mockResolvedValueOnce("export function helper() {}");

      const config: DirectoryFormattingConfig = {
        folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
        filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      };
      const result = await formatDirectoryAsMarkdown(dirPath, config);

      expect(result).toContain("``` src/utils/helper.ts");
      expect(result).not.toContain("/test/project");
    });

    it("should handle empty directory", async () => {
      const dirPath = "/test/empty-project";
      mockFindFilesRecursively.mockResolvedValue([]);

      const config: DirectoryFormattingConfig = {
        folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
        filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      };
      const result = await formatDirectoryAsMarkdown(dirPath, config);

      expect(result).toBe("");
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it("should process multiple files in parallel", async () => {
      const dirPath = "/test/project";
      const mockFiles = [
        "/test/project/file1.ts",
        "/test/project/file2.ts",
        "/test/project/file3.ts",
      ];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValue("ts");
      mockReadFile
        .mockResolvedValueOnce("content1")
        .mockResolvedValueOnce("content2")
        .mockResolvedValueOnce("content3");

      const config: DirectoryFormattingConfig = {
        folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
        filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      };
      await formatDirectoryAsMarkdown(dirPath, config);

      // All files should be read in parallel
      expect(mockReadFile).toHaveBeenCalledTimes(3);
    });

    it("should filter out empty blocks from skipped binary files", async () => {
      const dirPath = "/test/project";
      const mockFiles = [
        "/test/project/image.jpg",
        "/test/project/code.ts",
        "/test/project/doc.pdf",
      ];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension
        .mockReturnValueOnce("jpg")
        .mockReturnValueOnce("ts")
        .mockReturnValueOnce("pdf");
      mockReadFile.mockResolvedValueOnce("const x = 1;");

      const config: DirectoryFormattingConfig = {
        folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
        filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      };
      const result = await formatDirectoryAsMarkdown(dirPath, config);

      // Should only contain one code block
      const codeBlockCount = (result.match(/```/g) ?? []).length;
      expect(codeBlockCount).toBe(2); // Opening and closing for the .ts file only
    });

    it("should handle files with no extension", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/Makefile"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("");
      mockReadFile.mockResolvedValueOnce("all: build");

      const config: DirectoryFormattingConfig = {
        folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
        filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      };
      const result = await formatDirectoryAsMarkdown(dirPath, config);

      expect(result).toContain("``` Makefile");
      expect(result).toContain("all: build");
    });

    it("should preserve multiple trailing/leading newlines after trim", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/file.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("ts");
      mockReadFile.mockResolvedValueOnce("line1\n\n\nline2");

      const config: DirectoryFormattingConfig = {
        folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
        filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
      };
      const result = await formatDirectoryAsMarkdown(dirPath, config);

      expect(result).toContain("line1\n\n\nline2");
    });

    it("should use config parameter correctly", async () => {
      const dirPath = "/test/project";
      const customConfig: DirectoryFormattingConfig = {
        folderIgnoreList: ["custom-ignore"] as readonly string[],
        filenameIgnorePrefix: "custom-",
        binaryFileExtensionIgnoreList: ["custom-ext"] as readonly string[],
      };
      mockFindFilesRecursively.mockResolvedValue([]);

      await formatDirectoryAsMarkdown(dirPath, customConfig);

      expect(mockFindFilesRecursively).toHaveBeenCalledWith(
        dirPath,
        customConfig.folderIgnoreList,
        customConfig.filenameIgnorePrefix,
      );
    });
  });
});
