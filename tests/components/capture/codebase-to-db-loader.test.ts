import "reflect-metadata";
import path from "path";
import CodebaseToDBLoader from "../../../src/components/capture/codebase-to-db-loader";
import { SourcesRepository } from "../../../src/repositories/source/sources.repository.interface";
import LLMRouter from "../../../src/llm/core/llm-router";
import { FileSummarizer } from "../../../src/components/capture/file-summarizer";
import * as fileOperations from "../../../src/common/utils/file-operations";
import * as directoryOperations from "../../../src/common/utils/directory-operations";
import * as pathUtils from "../../../src/common/utils/path-utils";
import * as textUtils from "../../../src/common/utils/text-utils";
import { fileProcessingConfig } from "../../../src/config/file-processing.config";

// Mock dependencies
jest.mock("../../../src/common/utils/file-operations");
jest.mock("../../../src/common/utils/directory-operations");
jest.mock("../../../src/common/utils/path-utils");
jest.mock("../../../src/common/utils/text-utils");
jest.mock("../../../src/common/utils/logging", () => ({
  logErrorMsgAndDetail: jest.fn(),
}));

jest.mock("../../../src/config/file-processing.config", () => ({
  fileProcessingConfig: {
    FOLDER_IGNORE_LIST: [".git", "node_modules"],
    FILENAME_PREFIX_IGNORE: [".", "_"],
    BINARY_FILE_EXTENSION_IGNORE_LIST: [".jpg", ".png", ".pdf", ".exe"],
    MAX_CONCURRENCY: 3,
  },
}));

jest.mock("path", () => ({
  ...jest.requireActual("path"),
  relative: jest.fn(),
  basename: jest.fn(),
}));

const mockFileOperations = fileOperations as jest.Mocked<typeof fileOperations>;
const mockDirectoryOperations = directoryOperations as jest.Mocked<typeof directoryOperations>;
const mockPathUtils = pathUtils as jest.Mocked<typeof pathUtils>;
const mockTextUtils = textUtils as jest.Mocked<typeof textUtils>;
const mockPath = path as jest.Mocked<typeof path>;

describe("CodebaseToDBLoader", () => {
  let loader: CodebaseToDBLoader;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockFileSummarizer: jest.Mocked<FileSummarizer>;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
    mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation();

    // Mock SourcesRepository
    mockSourcesRepository = {
      getProjectFilesPaths: jest.fn().mockResolvedValue([]),
      getProjectFileAndLineStats: jest.fn().mockResolvedValue({ fileCount: 0, linesOfCode: 0 }),
      deleteSourcesByProject: jest.fn().mockResolvedValue(undefined),
      doesProjectSourceExist: jest.fn().mockResolvedValue(false),
      insertSource: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SourcesRepository>;

    // Mock LLMRouter
    mockLLMRouter = {
      generateEmbeddings: jest.fn().mockResolvedValue([1.0, 2.0, 3.0]),
    } as unknown as jest.Mocked<LLMRouter>;

    // Mock FileSummarizer
    mockFileSummarizer = {
      getFileSummaryAsJSON: jest.fn().mockResolvedValue({
        classpath: "TestClass",
        purpose: "Testing component",
      }),
    } as unknown as jest.Mocked<FileSummarizer>;

    loader = new CodebaseToDBLoader(mockSourcesRepository, mockLLMRouter, mockFileSummarizer);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe("captureCodebaseToDatabase", () => {
    it("should process all found files successfully", async () => {
      const mockFiles = ["/src/file1.ts", "/src/file2.js"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile.mockResolvedValue("file content");
      mockTextUtils.countLines.mockReturnValue(10);
      mockPath.relative.mockImplementation((from, to) => to.replace(from + "/", ""));
      mockPath.basename.mockImplementation((filePath) => filePath.split("/").pop() ?? "");

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      expect(mockDirectoryOperations.findFilesRecursively).toHaveBeenCalledWith(
        "/src",
        fileProcessingConfig.FOLDER_IGNORE_LIST,
        fileProcessingConfig.FILENAME_PREFIX_IGNORE,
        true,
      );
      expect(mockSourcesRepository.deleteSourcesByProject).toHaveBeenCalledWith("testProject");
      expect(mockSourcesRepository.insertSource).toHaveBeenCalledTimes(2);
    });

    it("should skip already captured files when skipIfAlreadyCaptured is true", async () => {
      const mockFiles = ["/src/file1.ts", "/src/file2.js"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      // Mock existing file paths to indicate files are already captured
      mockSourcesRepository.getProjectFilesPaths.mockResolvedValue(["file1.ts", "file2.js"]);
      // Mock path.relative to return the relative paths
      mockPath.relative.mockImplementation((_from, to) => {
        if (to === "/src/file1.ts") return "file1.ts";
        if (to === "/src/file2.js") return "file2.js";
        return to;
      });

      await loader.captureCodebaseToDatabase("testProject", "/src", true);

      expect(mockSourcesRepository.deleteSourcesByProject).not.toHaveBeenCalled();
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Not capturing some of the metadata files"),
      );
      expect(mockSourcesRepository.insertSource).not.toHaveBeenCalled();
    });

    it("should delete existing project files when skipIfAlreadyCaptured is false", async () => {
      const mockFiles = ["/src/file1.ts"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile.mockResolvedValue("file content");
      mockTextUtils.countLines.mockReturnValue(10);
      mockPath.relative.mockReturnValue("file1.ts");
      mockPath.basename.mockReturnValue("file1.ts");

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      expect(mockSourcesRepository.deleteSourcesByProject).toHaveBeenCalledWith("testProject");
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining("Deleting older version of the project's metadata files"),
      );
    });
  });

  describe("concurrent file processing", () => {
    it("should process files concurrently with proper success/failure reporting", async () => {
      const mockFiles = ["/src/file1.ts", "/src/file2.js", "/src/file3.ts"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile
        .mockResolvedValueOnce("content1")
        .mockRejectedValueOnce(new Error("File read error"))
        .mockResolvedValueOnce("content3");

      mockTextUtils.countLines.mockReturnValue(10);
      mockPath.relative.mockImplementation((from, to) => to.replace(from + "/", ""));
      mockPath.basename.mockImplementation((filePath) => filePath.split("/").pop() ?? "");

      const { logErrorMsgAndDetail: mockLogError } = jest.requireMock(
        "../../../src/common/utils/logging",
      );

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      expect(mockConsoleLog).toHaveBeenCalledWith("Processed 3 files. Succeeded: 2, Failed: 1");
      expect(mockConsoleWarn).toHaveBeenCalledWith(
        "Warning: 1 files failed to process. Check logs for details.",
      );
      expect(mockLogError).toHaveBeenCalled();
    });

    it("should report all successful when no failures occur", async () => {
      const mockFiles = ["/src/file1.ts", "/src/file2.js"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile.mockResolvedValue("file content");
      mockTextUtils.countLines.mockReturnValue(10);
      mockPath.relative.mockImplementation((from, to) => to.replace(from + "/", ""));
      mockPath.basename.mockImplementation((filePath) => filePath.split("/").pop() ?? "");

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      expect(mockConsoleLog).toHaveBeenCalledWith("Processed 2 files. Succeeded: 2, Failed: 0");
      expect(mockConsoleWarn).not.toHaveBeenCalled();
    });

    it("should respect concurrency limits", async () => {
      // This is harder to test directly, but we can verify the setup
      const mockFiles = Array.from({ length: 10 }, (_, i) => `/src/file${i}.ts`);

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile.mockResolvedValue("content");
      mockTextUtils.countLines.mockReturnValue(5);
      mockPath.relative.mockImplementation((from, to) => to.replace(from + "/", ""));
      mockPath.basename.mockImplementation((filePath) => filePath.split("/").pop() ?? "");

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      expect(mockSourcesRepository.insertSource).toHaveBeenCalledTimes(10);
      expect(mockConsoleLog).toHaveBeenCalledWith("Processed 10 files. Succeeded: 10, Failed: 0");
    });
  });

  describe("file filtering", () => {
    it("should skip binary files", async () => {
      const mockFiles = ["/src/file1.ts", "/src/image.jpg", "/src/file2.js"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      // The getFileExtension is called for each file to determine the extension
      mockPathUtils.getFileExtension
        .mockReturnValueOnce("ts") // file1.ts -> ts (not in binary list)
        .mockReturnValueOnce(".jpg") // image.jpg -> .jpg (should be in binary list)
        .mockReturnValueOnce("js"); // file2.js -> js (not in binary list)

      mockFileOperations.readFile.mockResolvedValue("content");
      mockTextUtils.countLines.mockReturnValue(10);
      mockPath.relative.mockImplementation((from, to) => to.replace(from + "/", ""));
      mockPath.basename.mockImplementation((filePath) => filePath.split("/").pop() ?? "");

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      // Should only process 2 files (skip the .jpg file which should be in BINARY_FILE_EXTENSION_IGNORE_LIST)
      expect(mockSourcesRepository.insertSource).toHaveBeenCalledTimes(2);
    });

    it("should skip empty files", async () => {
      const mockFiles = ["/src/file1.ts", "/src/empty.js", "/src/file3.ts"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile
        .mockResolvedValueOnce("content")
        .mockResolvedValueOnce("   ") // Empty after trim
        .mockResolvedValueOnce("more content");

      mockTextUtils.countLines.mockReturnValue(10);
      mockPath.relative.mockImplementation((from, to) => to.replace(from + "/", ""));
      mockPath.basename.mockImplementation((filePath) => filePath.split("/").pop() ?? "");

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      // Should only process 2 files (skip the empty file)
      expect(mockSourcesRepository.insertSource).toHaveBeenCalledTimes(2);
    });
  });

  describe("summary and embedding generation", () => {
    it("should generate summary and embeddings successfully", async () => {
      const mockFiles = ["/src/file1.ts"];
      const mockSummary = {
        classpath: "TestClass",
        purpose: "Test component",
        implementation:
          "This is a test component implementation that provides testing functionality.",
      };

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile.mockResolvedValue("file content");
      mockTextUtils.countLines.mockReturnValue(10);
      mockFileSummarizer.getFileSummaryAsJSON.mockResolvedValue(mockSummary);
      mockLLMRouter.generateEmbeddings
        .mockResolvedValueOnce([1, 2, 3]) // summary embedding
        .mockResolvedValueOnce([4, 5, 6]); // content embedding

      mockPath.relative.mockReturnValue("file1.ts");
      mockPath.basename.mockReturnValue("file1.ts");

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      expect(mockFileSummarizer.getFileSummaryAsJSON).toHaveBeenCalledWith(
        "file1.ts",
        "ts",
        "file content",
      );
      expect(mockLLMRouter.generateEmbeddings).toHaveBeenCalledTimes(2);
      expect(mockSourcesRepository.insertSource).toHaveBeenCalledWith(
        expect.objectContaining({
          projectName: "testProject",
          filename: "file1.ts",
          filepath: "file1.ts",
          type: "ts",
          linesCount: 10,
          content: "file content",
          summary: mockSummary,
          summaryVector: [1, 2, 3],
          contentVector: [4, 5, 6],
        }),
      );
    });

    it("should handle summary generation errors gracefully", async () => {
      const mockFiles = ["/src/file1.ts"];
      const summaryError = new Error("Summary generation failed");

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile.mockResolvedValue("file content");
      mockTextUtils.countLines.mockReturnValue(10);
      mockFileSummarizer.getFileSummaryAsJSON.mockRejectedValue(summaryError);
      mockLLMRouter.generateEmbeddings.mockResolvedValue([4, 5, 6]); // content embedding

      mockPath.relative.mockReturnValue("file1.ts");
      mockPath.basename.mockReturnValue("file1.ts");

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      expect(mockSourcesRepository.insertSource).toHaveBeenCalledWith(
        expect.objectContaining({
          summaryError: "Failed to generate summary: Summary generation failed",
        }),
      );
      expect(mockSourcesRepository.insertSource).toHaveBeenCalledWith(
        expect.not.objectContaining({
          summary: expect.anything(),
          summaryVector: expect.anything(),
        }),
      );
    });

    it("should handle embedding generation failures gracefully", async () => {
      const mockFiles = ["/src/file1.ts"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile.mockResolvedValue("file content");
      mockTextUtils.countLines.mockReturnValue(10);
      mockLLMRouter.generateEmbeddings.mockResolvedValue(null); // Embedding failed

      mockPath.relative.mockReturnValue("file1.ts");
      mockPath.basename.mockReturnValue("file1.ts");

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      expect(mockSourcesRepository.insertSource).toHaveBeenCalledWith(
        expect.not.objectContaining({
          summaryVector: expect.anything(),
          contentVector: expect.anything(),
        }),
      );
    });

    it("should handle partial embedding failures", async () => {
      const mockFiles = ["/src/file1.ts"];
      const mockSummary = {
        classpath: "TestClass",
        purpose: "Test component",
        implementation:
          "This is a test component implementation that provides testing functionality.",
      };

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile.mockResolvedValue("file content");
      mockTextUtils.countLines.mockReturnValue(10);
      mockFileSummarizer.getFileSummaryAsJSON.mockResolvedValue(mockSummary);
      mockLLMRouter.generateEmbeddings
        .mockResolvedValueOnce([1, 2, 3]) // summary embedding success
        .mockResolvedValueOnce(null); // content embedding failure

      mockPath.relative.mockReturnValue("file1.ts");
      mockPath.basename.mockReturnValue("file1.ts");

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      expect(mockSourcesRepository.insertSource).toHaveBeenCalledWith(
        expect.objectContaining({
          summaryVector: [1, 2, 3],
        }),
      );
      expect(mockSourcesRepository.insertSource).toHaveBeenCalledWith(
        expect.not.objectContaining({
          contentVector: expect.anything(),
        }),
      );
    });
  });

  describe("error propagation", () => {
    it("should propagate individual file processing errors", async () => {
      const mockFiles = ["/src/file1.ts"];
      const processingError = new Error("Processing failed");

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile.mockRejectedValue(processingError);

      const { logErrorMsgAndDetail: mockLogError } = jest.requireMock(
        "../../../src/common/utils/logging",
      );

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      expect(mockLogError).toHaveBeenCalledWith(
        'Failed to process file: "/src/file1.ts"',
        processingError,
      );
    });

    it("should continue processing other files when one fails", async () => {
      const mockFiles = ["/src/file1.ts", "/src/file2.ts", "/src/file3.ts"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockFileOperations.readFile
        .mockResolvedValueOnce("content1")
        .mockRejectedValueOnce(new Error("File2 failed"))
        .mockResolvedValueOnce("content3");

      mockTextUtils.countLines.mockReturnValue(10);
      mockPath.relative.mockImplementation((from, to) => to.replace(from + "/", ""));
      mockPath.basename.mockImplementation((filePath) => filePath.split("/").pop() ?? "");

      await loader.captureCodebaseToDatabase("testProject", "/src", false);

      // Should still insert the successful files
      expect(mockSourcesRepository.insertSource).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenCalledWith("Processed 3 files. Succeeded: 2, Failed: 1");
    });
  });
});
