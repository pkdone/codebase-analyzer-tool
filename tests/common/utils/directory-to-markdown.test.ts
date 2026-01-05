import { formatSourceFilesAsMarkdown } from "../../../src/app/utils/codebase-formatting";
import { findFilesRecursively } from "../../../src/common/fs/directory-operations";
import { getFileExtension } from "../../../src/common/fs/path-utils";
import { readFile } from "../../../src/common/fs/file-operations";
import { fileProcessingRules as fileProcessingConfig } from "../../../src/app/config/file-handling";

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

  // Use config values for tests
  const folderIgnoreList = fileProcessingConfig.FOLDER_IGNORE_LIST;
  const filenameIgnorePrefix = fileProcessingConfig.FILENAME_PREFIX_IGNORE;
  const binaryIgnoreList = fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST;
  const filenameIgnoreList = fileProcessingConfig.FILENAME_IGNORE_LIST;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("formatSourceFilesAsMarkdown", () => {
    it("should process a directory and generate markdown code blocks", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/file1.ts", "/test/project/file2.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("ts").mockReturnValueOnce("ts");
      mockReadFile.mockResolvedValueOnce("const x = 1;").mockResolvedValueOnce("var y = 2;");

      const result = await formatSourceFilesAsMarkdown(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        binaryIgnoreList,
        filenameIgnoreList,
      );

      expect(mockFindFilesRecursively).toHaveBeenCalledWith(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        filenameIgnoreList,
      );

      expect(result).toContain("``` file1.ts");
      expect(result).toContain("const x = 1;");
      expect(result).toContain("``` file2.ts");
      expect(result).toContain("var y = 2;");
    });

    it("should remove trailing slashes from the directory path", async () => {
      const dirPath = "/test/project/";
      mockFindFilesRecursively.mockResolvedValue([]);

      await formatSourceFilesAsMarkdown(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        binaryIgnoreList,
        filenameIgnoreList,
      );

      expect(mockFindFilesRecursively).toHaveBeenCalledWith(
        "/test/project",
        folderIgnoreList,
        filenameIgnorePrefix,
        filenameIgnoreList,
      );
    });

    it("should skip binary files based on ignore list", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/image.png", "/test/project/code.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("png").mockReturnValueOnce("ts");
      mockReadFile.mockResolvedValueOnce("const x = 1;"); // Only called for .ts file

      const result = await formatSourceFilesAsMarkdown(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        binaryIgnoreList,
        filenameIgnoreList,
      );

      expect(mockReadFile).toHaveBeenCalledTimes(1);
      expect(result).not.toContain("image.png");
      expect(result).toContain("code.ts");
    });

    it("should handle uppercase file extensions", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/image.PNG"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("PNG");

      const result = await formatSourceFilesAsMarkdown(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        binaryIgnoreList,
        filenameIgnoreList,
      );

      expect(result).not.toContain("image.PNG");
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it("should trim file content in markdown blocks", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/file.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("ts");
      mockReadFile.mockResolvedValueOnce("  \n\nconst x = 1;\n\n  ");

      const result = await formatSourceFilesAsMarkdown(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        binaryIgnoreList,
        filenameIgnoreList,
      );

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

      const result = await formatSourceFilesAsMarkdown(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        binaryIgnoreList,
        filenameIgnoreList,
      );

      expect(result).toContain("``` src/utils/helper.ts");
      expect(result).not.toContain("/test/project");
    });

    it("should handle empty directory", async () => {
      const dirPath = "/test/empty-project";
      mockFindFilesRecursively.mockResolvedValue([]);

      const result = await formatSourceFilesAsMarkdown(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        binaryIgnoreList,
        filenameIgnoreList,
      );

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

      await formatSourceFilesAsMarkdown(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        binaryIgnoreList,
        filenameIgnoreList,
      );

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

      const result = await formatSourceFilesAsMarkdown(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        binaryIgnoreList,
        filenameIgnoreList,
      );

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

      const result = await formatSourceFilesAsMarkdown(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        binaryIgnoreList,
        filenameIgnoreList,
      );

      expect(result).toContain("``` Makefile");
      expect(result).toContain("all: build");
    });

    it("should preserve multiple trailing/leading newlines after trim", async () => {
      const dirPath = "/test/project";
      const mockFiles = ["/test/project/file.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("ts");
      mockReadFile.mockResolvedValueOnce("line1\n\n\nline2");

      const result = await formatSourceFilesAsMarkdown(
        dirPath,
        folderIgnoreList,
        filenameIgnorePrefix,
        binaryIgnoreList,
        filenameIgnoreList,
      );

      expect(result).toContain("line1\n\n\nline2");
    });

    it("should use custom parameters correctly", async () => {
      const dirPath = "/test/project";
      const customFolderIgnoreList = ["custom-ignore"] as readonly string[];
      const customFilenameIgnorePrefix = "custom-";
      const customBinaryIgnoreList = ["custom-ext"] as readonly string[];
      const customFilenameIgnoreList = ["custom-file.lock"] as readonly string[];
      mockFindFilesRecursively.mockResolvedValue([]);

      await formatSourceFilesAsMarkdown(
        dirPath,
        customFolderIgnoreList,
        customFilenameIgnorePrefix,
        customBinaryIgnoreList,
        customFilenameIgnoreList,
      );

      expect(mockFindFilesRecursively).toHaveBeenCalledWith(
        dirPath,
        customFolderIgnoreList,
        customFilenameIgnorePrefix,
        customFilenameIgnoreList,
      );
    });
  });
});
