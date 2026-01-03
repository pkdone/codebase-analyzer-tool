import "reflect-metadata";
import path from "path";
import CodebaseToDBLoader from "../../../../src/app/components/capture/codebase-to-db-loader";
import { SourcesRepository } from "../../../../src/app/repositories/sources/sources.repository.interface";
import LLMRouter from "../../../../src/common/llm/llm-router";
import { FileSummarizerService } from "../../../../src/app/components/capture/file-summarizer.service";
import * as fileOperations from "../../../../src/common/fs/file-operations";
import * as directoryOperations from "../../../../src/common/fs/directory-operations";
import * as pathUtils from "../../../../src/common/fs/path-utils";
import * as textAnalysis from "../../../../src/common/utils/text-utils";
import { ok, err } from "../../../../src/common/types/result.types";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";

// Mock dependencies
jest.mock("../../../../src/common/fs/file-operations");
jest.mock("../../../../src/common/fs/directory-operations");
jest.mock("../../../../src/common/fs/path-utils");
jest.mock("../../../../src/common/utils/text-utils");
jest.mock("../../../../src/common/utils/logging", () => ({
  logError: jest.fn(),
  logOneLineWarning: jest.fn(),
  logOneLineError: jest.fn(),
}));

jest.mock("../../../../src/app/config/file-processing.config", () => ({
  fileProcessingConfig: {
    FOLDER_IGNORE_LIST: [".git", "node_modules"],
    FILENAME_PREFIX_IGNORE: [".", "_"],
    FILENAME_IGNORE_LIST: ["package-lock.json"],
    BINARY_FILE_EXTENSION_IGNORE_LIST: ["jpg", "png", "pdf", "exe"],
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
const mockTextUtils = textAnalysis as jest.Mocked<typeof textAnalysis>;
const mockPath = path as jest.Mocked<typeof path>;

describe("CodebaseToDBLoader", () => {
  let loader: CodebaseToDBLoader;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockFileSummarizer: jest.Mocked<FileSummarizerService>;
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

    // Mock FileSummarizerService
    mockFileSummarizer = {
      summarize: jest.fn().mockResolvedValue(
        ok({
          namespace: "TestClass",
          purpose: "Testing component",
          implementation: "Test implementation",
          databaseIntegration: {
            mechanism: "NONE",
            description: "n/a",
            codeExample: "n/a",
          },
        }),
      ),
    } as unknown as jest.Mocked<FileSummarizerService>;

    // Default mock for sortFilesBySize - returns files in same order
    mockDirectoryOperations.sortFilesBySize.mockImplementation(async (files) => files);

    loader = new CodebaseToDBLoader(mockSourcesRepository, mockLLMRouter, mockFileSummarizer);
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe("captureCodebaseToDatabase", () => {
    it("should process all found files successfully", async () => {
      const mockFiles = ["/src/file1.ts", "/src/file2.ts"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockPath.relative.mockReturnValue("file1.ts");
      mockPath.basename.mockReturnValue("file1.ts");
      mockFileOperations.readFile.mockResolvedValue("const x = 1;");
      mockTextUtils.countLines.mockReturnValue(1);

      await loader.captureCodebaseToDatabase("test-project", "/src", false);

      expect(mockDirectoryOperations.findFilesRecursively).toHaveBeenCalledWith(
        "/src",
        [".git", "node_modules"],
        [".", "_"],
        ["package-lock.json"],
      );
      expect(mockSourcesRepository.insertSource).toHaveBeenCalledTimes(2);
    });

    it("should skip already captured files when skipIfAlreadyCaptured is true", async () => {
      const mockFiles = ["/src/file1.ts", "/src/file2.ts"];
      const existingFiles = ["file1.ts"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockSourcesRepository.getProjectFilesPaths.mockResolvedValue(existingFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockPath.relative.mockReturnValueOnce("file1.ts").mockReturnValueOnce("file2.ts");
      mockPath.basename.mockReturnValue("file2.ts");
      mockFileOperations.readFile.mockResolvedValue("const x = 1;");
      mockTextUtils.countLines.mockReturnValue(1);

      await loader.captureCodebaseToDatabase("test-project", "/src", true);

      expect(mockSourcesRepository.insertSource).toHaveBeenCalledTimes(1);
    });

    it("should delete existing sources when skipIfAlreadyCaptured is false", async () => {
      mockDirectoryOperations.findFilesRecursively.mockResolvedValue([]);

      await loader.captureCodebaseToDatabase("test-project", "/src", false);

      expect(mockSourcesRepository.deleteSourcesByProject).toHaveBeenCalledWith("test-project");
    });

    it("should not delete existing sources when skipIfAlreadyCaptured is true", async () => {
      mockDirectoryOperations.findFilesRecursively.mockResolvedValue([]);
      mockSourcesRepository.getProjectFilesPaths.mockResolvedValue([]);

      await loader.captureCodebaseToDatabase("test-project", "/src", true);

      expect(mockSourcesRepository.deleteSourcesByProject).not.toHaveBeenCalled();
    });

    it("should skip binary files", async () => {
      const mockFiles = ["/src/image.jpg", "/src/file.ts"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValueOnce("jpg").mockReturnValueOnce("ts");
      mockPath.relative.mockReturnValue("file.ts");
      mockPath.basename.mockReturnValue("file.ts");
      mockFileOperations.readFile.mockResolvedValue("const x = 1;");
      mockTextUtils.countLines.mockReturnValue(1);

      await loader.captureCodebaseToDatabase("test-project", "/src", false);

      expect(mockSourcesRepository.insertSource).toHaveBeenCalledTimes(1);
    });

    it("should skip empty files", async () => {
      const mockFiles = ["/src/empty.ts", "/src/file.ts"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockPath.relative.mockReturnValue("file.ts");
      mockPath.basename.mockReturnValue("file.ts");
      mockFileOperations.readFile
        .mockResolvedValueOnce("   ")
        .mockResolvedValueOnce("const x = 1;");
      mockTextUtils.countLines.mockReturnValue(1);

      await loader.captureCodebaseToDatabase("test-project", "/src", false);

      expect(mockSourcesRepository.insertSource).toHaveBeenCalledTimes(1);
    });

    it("should handle summarization errors gracefully", async () => {
      const mockFiles = ["/src/file1.ts"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockPath.relative.mockReturnValue("file1.ts");
      mockPath.basename.mockReturnValue("file1.ts");
      mockFileOperations.readFile.mockResolvedValue("const x = 1;");
      mockTextUtils.countLines.mockReturnValue(1);
      mockFileSummarizer.summarize.mockResolvedValue(
        err(
          new LLMError(LLMErrorCode.BAD_RESPONSE_CONTENT, "Failed to generate summary: LLM error"),
        ),
      );

      await loader.captureCodebaseToDatabase("test-project", "/src", false);

      // File should still be inserted with summaryError
      expect(mockSourcesRepository.insertSource).toHaveBeenCalledWith(
        expect.objectContaining({
          summaryError: expect.stringContaining("Failed to generate summary"),
        }),
      );
    });

    it("should log warnings when there are failures", async () => {
      const mockFiles = ["/src/file1.ts"];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockPath.relative.mockReturnValue("file1.ts");
      mockFileOperations.readFile.mockRejectedValue(new Error("Read failed"));

      await loader.captureCodebaseToDatabase("test-project", "/src", false);

      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining("failed to process"));
    });

    it("should include embeddings in source record", async () => {
      const mockFiles = ["/src/file1.ts"];
      const mockEmbeddings = [0.1, 0.2, 0.3];

      mockDirectoryOperations.findFilesRecursively.mockResolvedValue(mockFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockPath.relative.mockReturnValue("file1.ts");
      mockPath.basename.mockReturnValue("file1.ts");
      mockFileOperations.readFile.mockResolvedValue("const x = 1;");
      mockTextUtils.countLines.mockReturnValue(1);
      mockLLMRouter.generateEmbeddings.mockResolvedValue(mockEmbeddings);

      await loader.captureCodebaseToDatabase("test-project", "/src", false);

      expect(mockSourcesRepository.insertSource).toHaveBeenCalledWith(
        expect.objectContaining({
          contentVector: mockEmbeddings,
          summaryVector: mockEmbeddings,
        }),
      );
    });
  });
});
