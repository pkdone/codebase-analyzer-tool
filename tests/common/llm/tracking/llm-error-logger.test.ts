import "reflect-metadata";
import { LLMErrorLogger } from "../../../../src/common/llm/tracking/llm-error-logger";
import type { LLMContext, LLMGeneratedContent } from "../../../../src/common/llm/types/llm.types";
import { writeFile } from "../../../../src/common/fs/file-operations";
import { ensureDirectoryExists } from "../../../../src/common/fs/directory-operations";
import { logOneLineWarning, logOneLineError } from "../../../../src/common/utils/logging";

// Mock dependencies
jest.mock("../../../../src/common/fs/file-operations");
jest.mock("../../../../src/common/fs/directory-operations");
jest.mock("../../../../src/common/utils/logging");

const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockEnsureDirectoryExists = ensureDirectoryExists as jest.MockedFunction<
  typeof ensureDirectoryExists
>;
const mockLogOneLineWarning = logOneLineWarning as jest.MockedFunction<typeof logOneLineWarning>;
const mockLogOneLineError = logOneLineError as jest.MockedFunction<typeof logOneLineError>;

describe("LLMErrorLogger", () => {
  let logger: LLMErrorLogger;
  let mockContext: LLMContext;
  let mockResponseContent: LLMGeneratedContent;

  beforeEach(() => {
    const mockConfig = {
      errorLogDirectory: "/tmp/test-errors",
      errorLogFilenameTemplate: "llm-error-{timestamp}.log",
    };
    logger = new LLMErrorLogger(mockConfig);
    mockContext = {
      resource: "test-resource",
    } as LLMContext;
    mockResponseContent = '{"invalid": json}';

    jest.clearAllMocks();
    mockEnsureDirectoryExists.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);
  });

  describe("recordJsonProcessingError", () => {
    it("should skip logging when responseContent is not a string", async () => {
      await logger.recordJsonProcessingError(new Error("test"), null as any, mockContext);

      expect(mockWriteFile).not.toHaveBeenCalled();
    });

    it("should write error log file with correct content", async () => {
      const testError = new Error("JSON parse error");
      await logger.recordJsonProcessingError(testError, mockResponseContent, mockContext);

      expect(mockEnsureDirectoryExists).toHaveBeenCalledWith("/tmp/test-errors");
      expect(mockWriteFile).toHaveBeenCalled();
      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[0]).toMatch(/\/tmp\/test-errors\/llm-error-.*\.log/);
      expect(writeCall[1]).toContain("test-resource");
      expect(writeCall[1]).toContain("JSON parse error");
      expect(writeCall[1]).toContain('{"invalid": json}');
    });

    it("should log warning on first error", async () => {
      const testError = new Error("JSON parse error");
      await logger.recordJsonProcessingError(testError, mockResponseContent, mockContext);

      expect(mockLogOneLineWarning).toHaveBeenCalledTimes(1);
      expect(mockLogOneLineWarning).toHaveBeenCalledWith(
        expect.stringContaining("First of potentially numerous errors"),
      );
    });

    it("should not log warning on subsequent errors", async () => {
      const testError = new Error("JSON parse error");
      await logger.recordJsonProcessingError(testError, mockResponseContent, mockContext);
      await logger.recordJsonProcessingError(testError, mockResponseContent, mockContext);

      expect(mockLogOneLineWarning).toHaveBeenCalledTimes(1);
    });

    it("should handle file write errors gracefully", async () => {
      const fileError = new Error("File write failed");
      mockWriteFile.mockRejectedValue(fileError);

      const testError = new Error("JSON parse error");
      await logger.recordJsonProcessingError(testError, mockResponseContent, mockContext);

      expect(mockLogOneLineError).toHaveBeenCalledWith(
        "Failed to write error log file:",
        fileError,
      );
    });

    it("should handle error with cause", async () => {
      const causeError = new Error("Root cause");
      const testError = new Error("JSON parse error");
      (testError as any).cause = causeError;

      await logger.recordJsonProcessingError(testError, mockResponseContent, mockContext);

      const writeCall = mockWriteFile.mock.calls[0];
      expect(writeCall[1]).toContain("Root cause");
    });
  });
});
