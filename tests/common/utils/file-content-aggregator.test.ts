import "reflect-metadata";
import { aggregateFilesToMarkdown } from "../../../src/common/utils/file-content-aggregator";
import { findFilesRecursively } from "../../../src/common/fs/directory-operations";
import { getFileExtension } from "../../../src/common/fs/path-utils";
import { readFile } from "../../../src/common/fs/file-operations";
import type { FileFilterConfig } from "../../../src/common/fs/file-filter.types";
import { fileProcessingRules as fileProcessingConfig } from "../../../src/app/config/file-handling";

// Mock dependencies
jest.mock("../../../src/common/fs/directory-operations");
jest.mock("../../../src/common/fs/path-utils");
jest.mock("../../../src/common/fs/file-operations");

describe("aggregateFilesToMarkdown", () => {
  const mockFindFilesRecursively = findFilesRecursively as jest.MockedFunction<
    typeof findFilesRecursively
  >;
  const mockGetFileExtension = getFileExtension as jest.MockedFunction<typeof getFileExtension>;
  const mockReadFile = readFile as jest.MockedFunction<typeof readFile>;

  // Build filter config from config values for tests
  const filterConfig: FileFilterConfig = {
    folderIgnoreList: fileProcessingConfig.FOLDER_IGNORE_LIST,
    filenameIgnorePrefix: fileProcessingConfig.FILENAME_PREFIX_IGNORE,
    binaryFileExtensionIgnoreList: fileProcessingConfig.BINARY_FILE_EXTENSION_IGNORE_LIST,
    filenameIgnoreList: fileProcessingConfig.FILENAME_IGNORE_LIST,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should process a directory and generate markdown code blocks", async () => {
    const dirPath = "/test/project";
    const mockFiles = ["/test/project/file1.ts", "/test/project/file2.ts"];

    mockFindFilesRecursively.mockResolvedValue(mockFiles);
    mockGetFileExtension.mockReturnValueOnce("ts").mockReturnValueOnce("ts");
    mockReadFile.mockResolvedValueOnce("const x = 1;").mockResolvedValueOnce("var y = 2;");

    const result = await aggregateFilesToMarkdown(dirPath, filterConfig);

    expect(mockFindFilesRecursively).toHaveBeenCalledWith(dirPath, {
      folderIgnoreList: filterConfig.folderIgnoreList,
      filenameIgnorePrefix: filterConfig.filenameIgnorePrefix,
      filenameIgnoreList: filterConfig.filenameIgnoreList,
    });

    expect(result).toContain("``` file1.ts");
    expect(result).toContain("const x = 1;");
    expect(result).toContain("``` file2.ts");
    expect(result).toContain("var y = 2;");
  });

  it("should remove trailing slashes from the directory path", async () => {
    const dirPath = "/test/project/";
    mockFindFilesRecursively.mockResolvedValue([]);

    await aggregateFilesToMarkdown(dirPath, filterConfig);

    expect(mockFindFilesRecursively).toHaveBeenCalledWith("/test/project", {
      folderIgnoreList: filterConfig.folderIgnoreList,
      filenameIgnorePrefix: filterConfig.filenameIgnorePrefix,
      filenameIgnoreList: filterConfig.filenameIgnoreList,
    });
  });

  it("should skip binary files based on ignore list", async () => {
    const dirPath = "/test/project";
    const mockFiles = ["/test/project/image.png", "/test/project/code.ts"];

    mockFindFilesRecursively.mockResolvedValue(mockFiles);
    mockGetFileExtension.mockReturnValueOnce("png").mockReturnValueOnce("ts");
    mockReadFile.mockResolvedValueOnce("const x = 1;"); // Only called for .ts file

    const result = await aggregateFilesToMarkdown(dirPath, filterConfig);

    expect(mockReadFile).toHaveBeenCalledTimes(1);
    expect(result).not.toContain("image.png");
    expect(result).toContain("code.ts");
  });

  it("should handle uppercase file extensions", async () => {
    const dirPath = "/test/project";
    const mockFiles = ["/test/project/image.PNG"];

    mockFindFilesRecursively.mockResolvedValue(mockFiles);
    mockGetFileExtension.mockReturnValueOnce("PNG");

    const result = await aggregateFilesToMarkdown(dirPath, filterConfig);

    expect(result).not.toContain("image.PNG");
    expect(mockReadFile).not.toHaveBeenCalled();
  });

  it("should trim file content in markdown blocks", async () => {
    const dirPath = "/test/project";
    const mockFiles = ["/test/project/file.ts"];

    mockFindFilesRecursively.mockResolvedValue(mockFiles);
    mockGetFileExtension.mockReturnValueOnce("ts");
    mockReadFile.mockResolvedValueOnce("  \n\nconst x = 1;\n\n  ");

    const result = await aggregateFilesToMarkdown(dirPath, filterConfig);

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

    const result = await aggregateFilesToMarkdown(dirPath, filterConfig);

    expect(result).toContain("``` src/utils/helper.ts");
    expect(result).not.toContain("/test/project");
  });

  it("should handle empty directory", async () => {
    const dirPath = "/test/empty-project";
    mockFindFilesRecursively.mockResolvedValue([]);

    const result = await aggregateFilesToMarkdown(dirPath, filterConfig);

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

    await aggregateFilesToMarkdown(dirPath, filterConfig);

    // All files should be read in parallel
    expect(mockReadFile).toHaveBeenCalledTimes(3);
  });

  it("should filter out empty blocks from skipped binary files", async () => {
    const dirPath = "/test/project";
    const mockFiles = ["/test/project/image.jpg", "/test/project/code.ts", "/test/project/doc.pdf"];

    mockFindFilesRecursively.mockResolvedValue(mockFiles);
    mockGetFileExtension
      .mockReturnValueOnce("jpg")
      .mockReturnValueOnce("ts")
      .mockReturnValueOnce("pdf");
    mockReadFile.mockResolvedValueOnce("const x = 1;");

    const result = await aggregateFilesToMarkdown(dirPath, filterConfig);

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

    const result = await aggregateFilesToMarkdown(dirPath, filterConfig);

    expect(result).toContain("``` Makefile");
    expect(result).toContain("all: build");
  });

  it("should preserve multiple trailing/leading newlines after trim", async () => {
    const dirPath = "/test/project";
    const mockFiles = ["/test/project/file.ts"];

    mockFindFilesRecursively.mockResolvedValue(mockFiles);
    mockGetFileExtension.mockReturnValueOnce("ts");
    mockReadFile.mockResolvedValueOnce("line1\n\n\nline2");

    const result = await aggregateFilesToMarkdown(dirPath, filterConfig);

    expect(result).toContain("line1\n\n\nline2");
  });

  it("should use custom parameters correctly", async () => {
    const dirPath = "/test/project";
    const customFilterConfig: FileFilterConfig = {
      folderIgnoreList: ["custom-ignore"],
      filenameIgnorePrefix: "custom-",
      binaryFileExtensionIgnoreList: ["custom-ext"],
      filenameIgnoreList: ["custom-file.lock"],
    };
    mockFindFilesRecursively.mockResolvedValue([]);

    await aggregateFilesToMarkdown(dirPath, customFilterConfig);

    expect(mockFindFilesRecursively).toHaveBeenCalledWith(dirPath, {
      folderIgnoreList: customFilterConfig.folderIgnoreList,
      filenameIgnorePrefix: customFilterConfig.filenameIgnorePrefix,
      filenameIgnoreList: customFilterConfig.filenameIgnoreList,
    });
  });
});
