import { formatCodeBlockMarkdownFromFolderCodebase } from "../../../../src/common/utils/codebase-formatter";
import { findFilesRecursively } from "../../../../src/common/fs/directory-operations";
import { getFileExtension } from "../../../../src/common/fs/path-utils";
import { readFile } from "../../../../src/common/fs/file-operations";
import { fileProcessingConfig } from "../../../../src/config/file-processing.config";

// Mock dependencies
jest.mock("../../../../src/common/fs/directory-operations");
jest.mock("../../../../src/common/fs/path-utils");
jest.mock("../../../../src/common/fs/file-operations");
jest.mock("../../../../src/config/file-processing.config", () => ({
  fileProcessingConfig: {
    FOLDER_IGNORE_LIST: ["node_modules", "dist"],
    FILENAME_PREFIX_IGNORE: ["."],
    BINARY_FILE_EXTENSION_IGNORE_LIST: [".jpg", ".png", ".gif", ".pdf"],
  },
}));

describe("codebase-formatter", () => {
  const mockFindFilesRecursively = findFilesRecursively as jest.MockedFunction<
    typeof findFilesRecursively
  >;
  const mockGetFileExtension = getFileExtension as jest.MockedFunction<typeof getFileExtension>;
  const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("formatCodebaseForPrompt", () => {
    it("should process a codebase directory and generate markdown code blocks", async () => {
      const codebasePath = "/test/project";
      const mockFiles = ["/test/project/file1.ts", "/test/project/file2.js"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce(".ts").mockReturnValueOnce(".js");
      mockReadFile.mockResolvedValueOnce("const x = 1;").mockResolvedValueOnce("var y = 2;");

      const result = await formatCodeBlockMarkdownFromFolderCodebase(codebasePath);

      expect(mockFindFilesRecursively).toHaveBeenCalledWith(
        codebasePath,
        fileProcessingConfig.FOLDER_IGNORE_LIST,
        fileProcessingConfig.FILENAME_PREFIX_IGNORE,
      );

      expect(result).toContain("``` file1.ts");
      expect(result).toContain("const x = 1;");
      expect(result).toContain("``` file2.js");
      expect(result).toContain("var y = 2;");
    });

    it("should remove trailing slashes from the directory path", async () => {
      const codebasePath = "/test/project/";
      mockFindFilesRecursively.mockResolvedValue([]);

      await formatCodeBlockMarkdownFromFolderCodebase(codebasePath);

      expect(mockFindFilesRecursively).toHaveBeenCalledWith(
        "/test/project",
        fileProcessingConfig.FOLDER_IGNORE_LIST,
        fileProcessingConfig.FILENAME_PREFIX_IGNORE,
      );
    });

    it("should skip binary files based on ignore list", async () => {
      const codebasePath = "/test/project";
      const mockFiles = ["/test/project/image.png", "/test/project/code.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce(".png").mockReturnValueOnce(".ts");
      mockReadFile.mockResolvedValueOnce("const x = 1;"); // Only called for .ts file

      const result = await formatCodeBlockMarkdownFromFolderCodebase(codebasePath);

      expect(mockReadFile).toHaveBeenCalledTimes(1);
      expect(result).not.toContain("image.png");
      expect(result).toContain("code.ts");
    });

    it("should handle uppercase file extensions", async () => {
      const codebasePath = "/test/project";
      const mockFiles = ["/test/project/image.PNG"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce(".PNG");

      const result = await formatCodeBlockMarkdownFromFolderCodebase(codebasePath);

      expect(result).not.toContain("image.PNG");
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it("should trim file content in markdown blocks", async () => {
      const codebasePath = "/test/project";
      const mockFiles = ["/test/project/file.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce(".ts");
      mockReadFile.mockResolvedValueOnce("  \n\nconst x = 1;\n\n  ");

      const result = await formatCodeBlockMarkdownFromFolderCodebase(codebasePath);

      expect(result).toContain("const x = 1;");
      expect(result).not.toMatch(/^\s+const x = 1;/);
      expect(result).not.toMatch(/const x = 1;\s+$/);
    });

    it("should use relative file paths in markdown blocks", async () => {
      const codebasePath = "/test/project";
      const mockFiles = ["/test/project/src/utils/helper.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce(".ts");
      mockReadFile.mockResolvedValueOnce("export function helper() {}");

      const result = await formatCodeBlockMarkdownFromFolderCodebase(codebasePath);

      expect(result).toContain("``` src/utils/helper.ts");
      expect(result).not.toContain("/test/project");
    });

    it("should handle empty codebase directory", async () => {
      const codebasePath = "/test/empty-project";
      mockFindFilesRecursively.mockResolvedValue([]);

      const result = await formatCodeBlockMarkdownFromFolderCodebase(codebasePath);

      expect(result).toBe("");
      expect(mockReadFile).not.toHaveBeenCalled();
    });

    it("should process multiple files in parallel", async () => {
      const codebasePath = "/test/project";
      const mockFiles = [
        "/test/project/file1.ts",
        "/test/project/file2.ts",
        "/test/project/file3.ts",
      ];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValue(".ts");
      mockReadFile
        .mockResolvedValueOnce("content1")
        .mockResolvedValueOnce("content2")
        .mockResolvedValueOnce("content3");

      await formatCodeBlockMarkdownFromFolderCodebase(codebasePath);

      // All files should be read in parallel
      expect(mockReadFile).toHaveBeenCalledTimes(3);
    });

    it("should filter out empty blocks from skipped binary files", async () => {
      const codebasePath = "/test/project";
      const mockFiles = [
        "/test/project/image.jpg",
        "/test/project/code.ts",
        "/test/project/doc.pdf",
      ];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension
        .mockReturnValueOnce(".jpg")
        .mockReturnValueOnce(".ts")
        .mockReturnValueOnce(".pdf");
      mockReadFile.mockResolvedValueOnce("const x = 1;");

      const result = await formatCodeBlockMarkdownFromFolderCodebase(codebasePath);

      // Should only contain one code block
      const codeBlockCount = (result.match(/```/g) ?? []).length;
      expect(codeBlockCount).toBe(2); // Opening and closing for the .ts file only
    });

    it("should handle files with no extension", async () => {
      const codebasePath = "/test/project";
      const mockFiles = ["/test/project/Makefile"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce("");
      mockReadFile.mockResolvedValueOnce("all: build");

      const result = await formatCodeBlockMarkdownFromFolderCodebase(codebasePath);

      expect(result).toContain("``` Makefile");
      expect(result).toContain("all: build");
    });

    it("should preserve multiple trailing/leading newlines after trim", async () => {
      const codebasePath = "/test/project";
      const mockFiles = ["/test/project/file.ts"];

      mockFindFilesRecursively.mockResolvedValue(mockFiles);
      mockGetFileExtension.mockReturnValueOnce(".ts");
      mockReadFile.mockResolvedValueOnce("line1\n\n\nline2");

      const result = await formatCodeBlockMarkdownFromFolderCodebase(codebasePath);

      expect(result).toContain("line1\n\n\nline2");
    });
  });
});
