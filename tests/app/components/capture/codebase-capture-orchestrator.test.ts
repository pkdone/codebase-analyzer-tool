import "reflect-metadata";
import path from "path";
import CodebaseCaptureOrchestrator from "../../../../src/app/components/capture/codebase-capture-orchestrator";
import { SourcesRepository } from "../../../../src/app/repositories/sources/sources.repository.interface";
import LLMRouter from "../../../../src/common/llm/llm-router";
import { FileSummarizerService } from "../../../../src/app/components/capture/file-summarizer.service";
import { BufferedSourcesWriter } from "../../../../src/app/components/capture/buffered-sources-writer";
import * as fileOperations from "../../../../src/common/fs/file-operations";
import * as directoryOperations from "../../../../src/common/fs/directory-operations";
import * as pathUtils from "../../../../src/common/fs/path-utils";
import * as textAnalysis from "../../../../src/common/utils/text-utils";
import { ok, err } from "../../../../src/common/types/result.types";
import { LLMError, LLMErrorCode } from "../../../../src/common/llm/types/llm-errors.types";
import { getCanonicalFileType } from "../../../../src/app/components/capture/utils";
import { type FileProcessingRulesType } from "../../../../src/app/config/file-handling";
import type { LlmConcurrencyService } from "../../../../src/app/components/concurrency";

// Mock dependencies
jest.mock("../../../../src/common/fs/file-operations");
jest.mock("../../../../src/common/fs/directory-operations");
jest.mock("../../../../src/common/fs/path-utils");
jest.mock("../../../../src/common/utils/text-utils");
jest.mock("../../../../src/common/utils/logging", () => ({
  logError: jest.fn(),
  logWarn: jest.fn(),
  logErr: jest.fn(),
}));
jest.mock("../../../../src/app/components/capture/utils", () => ({
  getCanonicalFileType: jest.fn().mockReturnValue("javascript"),
}));

/**
 * Test configuration for file processing rules.
 * Injected directly into CodebaseCaptureOrchestrator instead of mocking module imports.
 * Uses type assertion to allow test-specific values without matching exact literal types.
 */
const mockFileProcessingRules = {
  FOLDER_IGNORE_LIST: [".git", "node_modules"],
  FILENAME_PREFIX_IGNORE: "test-",
  FILENAME_IGNORE_LIST: ["package-lock.json"],
  BINARY_FILE_EXTENSION_IGNORE_LIST: ["jpg", "png", "pdf", "exe"],
  CODE_FILE_EXTENSIONS: ["ts", "js"],
  BOM_DEPENDENCY_CANONICAL_TYPES: [],
  SCHEDULED_JOB_CANONICAL_TYPES: [],
} as unknown as FileProcessingRulesType;

const mockPathRelative = jest.fn();
const mockPathBasename = jest.fn();

jest.mock("path", () => ({
  ...jest.requireActual("path"),
  relative: (...args: unknown[]) => mockPathRelative(...args),
  basename: (...args: unknown[]) => mockPathBasename(...args),
}));

jest.mock("node:path", () => ({
  ...jest.requireActual("node:path"),
  relative: (...args: unknown[]) => mockPathRelative(...args),
  basename: (...args: unknown[]) => mockPathBasename(...args),
}));

const mockFileOperations = fileOperations as jest.Mocked<typeof fileOperations>;
const mockDirectoryOperations = directoryOperations as jest.Mocked<typeof directoryOperations>;
const mockPathUtils = pathUtils as jest.Mocked<typeof pathUtils>;
const mockTextUtils = textAnalysis as jest.Mocked<typeof textAnalysis>;
const mockGetCanonicalFileType = getCanonicalFileType as jest.MockedFunction<
  typeof getCanonicalFileType
>;
const mockPath = {
  ...jest.requireActual("path"),
  relative: mockPathRelative,
  basename: mockPathBasename,
} as jest.Mocked<typeof path>;

describe("CodebaseCaptureOrchestrator", () => {
  let service: CodebaseCaptureOrchestrator;
  let mockSourcesRepository: jest.Mocked<SourcesRepository>;
  let mockLLMRouter: jest.Mocked<LLMRouter>;
  let mockFileSummarizer: jest.Mocked<FileSummarizerService>;
  let mockBufferedWriter: jest.Mocked<BufferedSourcesWriter>;
  let mockConsoleLog: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPathRelative.mockClear();
    mockPathBasename.mockClear();

    mockConsoleLog = jest.spyOn(console, "log").mockImplementation();
    mockConsoleWarn = jest.spyOn(console, "warn").mockImplementation();

    // Mock SourcesRepository
    mockSourcesRepository = {
      getProjectFilesPaths: jest.fn().mockResolvedValue([]),
      getProjectFileAndLineStats: jest.fn().mockResolvedValue({ fileCount: 0, linesOfCode: 0 }),
      deleteSourcesByProject: jest.fn().mockResolvedValue(undefined),
      doesProjectSourceExist: jest.fn().mockResolvedValue(false),
      insertSource: jest.fn().mockResolvedValue(undefined),
      insertSources: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<SourcesRepository>;

    // Mock LLMRouter
    mockLLMRouter = {
      generateEmbeddings: jest.fn().mockResolvedValue({
        embeddings: [1.0, 2.0, 3.0],
        meta: {
          modelId: "openai/text-embedding-3-small",
          providerFamily: "openai",
          modelKey: "text-embedding-3-small",
        },
      }),
      getCompletionChain: jest
        .fn()
        .mockReturnValue([{ providerFamily: "openai", modelKey: "gpt-4" }]),
      getEmbeddingChain: jest
        .fn()
        .mockReturnValue([{ providerFamily: "openai", modelKey: "text-embedding-3-small" }]),
    } as unknown as jest.Mocked<LLMRouter>;

    // Mock FileSummarizerService
    mockFileSummarizer = {
      summarize: jest.fn().mockResolvedValue(
        ok({
          summary: {
            namespace: "TestClass",
            purpose: "Testing component",
            implementation: "Test implementation",
            databaseIntegration: {
              mechanism: "NONE",
              description: "n/a",
              codeExample: "n/a",
            },
          },
          modelKey: "gpt-4",
        }),
      ),
    } as unknown as jest.Mocked<FileSummarizerService>;

    // Mock BufferedSourcesWriter
    mockBufferedWriter = {
      add: jest.fn().mockResolvedValue(undefined),
      flush: jest.fn().mockResolvedValue(undefined),
      reset: jest.fn(),
      bufferedCount: 0,
    } as unknown as jest.Mocked<BufferedSourcesWriter>;

    // Create mock for LlmConcurrencyService that executes immediately
    const mockLlmConcurrencyService = {
      run: jest.fn().mockImplementation(async <T>(fn: () => Promise<T>) => fn()),
    } as unknown as jest.Mocked<LlmConcurrencyService>;

    // Create service with injected mock config (no module mocking needed)
    service = new CodebaseCaptureOrchestrator(
      mockSourcesRepository,
      mockLLMRouter,
      mockFileSummarizer,
      mockFileProcessingRules,
      mockLlmConcurrencyService,
      mockBufferedWriter,
    );
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
    mockConsoleWarn.mockRestore();
  });

  describe("captureCodebase", () => {
    it("should process all found files successfully", async () => {
      const mockFilesWithSize = [
        { filepath: "/src/file1.ts", size: 100 },
        { filepath: "/src/file2.ts", size: 50 },
      ];

      mockDirectoryOperations.findFilesWithSize.mockResolvedValue(mockFilesWithSize);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockPath.relative.mockReturnValueOnce("file1.ts").mockReturnValueOnce("file2.ts");
      mockPath.basename.mockReturnValueOnce("file1.ts").mockReturnValueOnce("file2.ts");
      mockFileOperations.readFile.mockResolvedValue("const x = 1;");
      mockTextUtils.countLines.mockReturnValue(1);
      mockGetCanonicalFileType.mockReturnValue("javascript");

      await service.captureCodebase("test-project", "/src", false);

      expect(mockDirectoryOperations.findFilesWithSize).toHaveBeenCalledWith("/src", {
        folderIgnoreList: [".git", "node_modules"],
        filenameIgnorePrefix: "test-",
        filenameIgnoreList: ["package-lock.json"],
      });
      // Files are added to the buffered writer
      expect(mockBufferedWriter.add).toHaveBeenCalledTimes(2);
      // Buffer is flushed at the end
      expect(mockBufferedWriter.flush).toHaveBeenCalled();
      // Verify summarize is called with canonicalFileType (not raw file extension)
      expect(mockFileSummarizer.summarize).toHaveBeenCalledWith(
        expect.any(String),
        "javascript",
        expect.any(String),
      );
    });

    it("should skip already ingested files when skipIfAlreadyIngested is true", async () => {
      const mockFilesWithSize = [
        { filepath: "/src/file1.ts", size: 100 },
        { filepath: "/src/file2.ts", size: 50 },
      ];
      const existingFiles = ["file1.ts"];

      mockDirectoryOperations.findFilesWithSize.mockResolvedValue(mockFilesWithSize);
      mockSourcesRepository.getProjectFilesPaths.mockResolvedValue(existingFiles);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockPath.relative.mockReturnValueOnce("file1.ts").mockReturnValueOnce("file2.ts");
      mockPath.basename.mockReturnValue("file2.ts");
      mockFileOperations.readFile.mockResolvedValue("const x = 1;");
      mockTextUtils.countLines.mockReturnValue(1);

      await service.captureCodebase("test-project", "/src", true);

      // Only one file should be added (the other was already ingested)
      expect(mockBufferedWriter.add).toHaveBeenCalledTimes(1);
      expect(mockBufferedWriter.flush).toHaveBeenCalled();
    });

    it("should delete existing sources when skipIfAlreadyIngested is false", async () => {
      mockDirectoryOperations.findFilesWithSize.mockResolvedValue([]);

      await service.captureCodebase("test-project", "/src", false);

      expect(mockSourcesRepository.deleteSourcesByProject).toHaveBeenCalledWith("test-project");
    });

    it("should not delete existing sources when skipIfAlreadyIngested is true", async () => {
      mockDirectoryOperations.findFilesWithSize.mockResolvedValue([]);
      mockSourcesRepository.getProjectFilesPaths.mockResolvedValue([]);

      await service.captureCodebase("test-project", "/src", true);

      expect(mockSourcesRepository.deleteSourcesByProject).not.toHaveBeenCalled();
    });

    it("should skip binary files", async () => {
      const mockFilesWithSize = [
        { filepath: "/src/image.jpg", size: 50000 },
        { filepath: "/src/file.ts", size: 100 },
      ];

      mockDirectoryOperations.findFilesWithSize.mockResolvedValue(mockFilesWithSize);
      mockPathUtils.getFileExtension.mockReturnValueOnce("jpg").mockReturnValueOnce("ts");
      mockPath.relative.mockReturnValue("file.ts");
      mockPath.basename.mockReturnValue("file.ts");
      mockFileOperations.readFile.mockResolvedValue("const x = 1;");
      mockTextUtils.countLines.mockReturnValue(1);

      await service.captureCodebase("test-project", "/src", false);

      // Binary files are skipped, only one file added
      expect(mockBufferedWriter.add).toHaveBeenCalledTimes(1);
      expect(mockBufferedWriter.flush).toHaveBeenCalled();
    });

    it("should skip empty files", async () => {
      const mockFilesWithSize = [
        { filepath: "/src/empty.ts", size: 0 },
        { filepath: "/src/file.ts", size: 100 },
      ];

      mockDirectoryOperations.findFilesWithSize.mockResolvedValue(mockFilesWithSize);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockPath.relative.mockReturnValue("file.ts");
      mockPath.basename.mockReturnValue("file.ts");
      mockFileOperations.readFile
        .mockResolvedValueOnce("   ")
        .mockResolvedValueOnce("const x = 1;");
      mockTextUtils.countLines.mockReturnValue(1);

      await service.captureCodebase("test-project", "/src", false);

      // Empty files are skipped, only one file added
      expect(mockBufferedWriter.add).toHaveBeenCalledTimes(1);
      expect(mockBufferedWriter.flush).toHaveBeenCalled();
    });

    it("should handle summarization errors gracefully", async () => {
      const mockFilesWithSize = [{ filepath: "/src/file1.ts", size: 100 }];

      mockDirectoryOperations.findFilesWithSize.mockResolvedValue(mockFilesWithSize);
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

      await service.captureCodebase("test-project", "/src", false);

      // File should still be added with summaryError
      expect(mockBufferedWriter.add).toHaveBeenCalled();
      expect(mockBufferedWriter.flush).toHaveBeenCalled();
    });

    it("should log warnings when there are failures", async () => {
      const mockFilesWithSize = [{ filepath: "/src/file1.ts", size: 100 }];

      mockDirectoryOperations.findFilesWithSize.mockResolvedValue(mockFilesWithSize);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockPath.relative.mockReturnValue("file1.ts");
      mockFileOperations.readFile.mockRejectedValue(new Error("Read failed"));

      await service.captureCodebase("test-project", "/src", false);

      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining("failed to process"));
    });

    it("should include embeddings in source record", async () => {
      const mockFilesWithSize = [{ filepath: "/src/file1.ts", size: 100 }];
      const mockEmbeddings = [0.1, 0.2, 0.3];

      mockDirectoryOperations.findFilesWithSize.mockResolvedValue(mockFilesWithSize);
      mockPathUtils.getFileExtension.mockReturnValue("ts");
      mockPath.relative.mockReturnValue("file1.ts");
      mockPath.basename.mockReturnValue("file1.ts");
      mockFileOperations.readFile.mockResolvedValue("const x = 1;");
      mockTextUtils.countLines.mockReturnValue(1);
      mockLLMRouter.generateEmbeddings.mockResolvedValue({
        embeddings: mockEmbeddings,
        meta: {
          modelId: "openai/text-embedding-3-small",
          providerFamily: "openai",
          modelKey: "text-embedding-3-small",
        },
      });

      await service.captureCodebase("test-project", "/src", false);

      // Records are added to buffer with embeddings
      expect(mockBufferedWriter.add).toHaveBeenCalledWith(
        expect.objectContaining({
          contentVector: mockEmbeddings,
        }),
      );
      expect(mockBufferedWriter.flush).toHaveBeenCalled();
    });

    it("should reset buffered writer before processing", async () => {
      mockDirectoryOperations.findFilesWithSize.mockResolvedValue([]);

      await service.captureCodebase("test-project", "/src", false);

      expect(mockBufferedWriter.reset).toHaveBeenCalled();
    });
  });
});
