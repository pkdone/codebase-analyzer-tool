import "reflect-metadata";
import CodebaseToDBLoader from "../../src/components/capture/codebase-to-db-loader";
import { repositoryTokens } from "../../src/di/tokens";
import { llmTokens } from "../../src/di/tokens";
import { container } from "tsyringe";

jest.mock("../../src/common/fs/directory-operations", () => ({
  findFilesRecursively: jest.fn(async () => ["/root/a.ts", "/root/b.ts"]),
  sortFilesBySize: jest.fn(async (files: string[]) => files),
}));
jest.mock("../../src/common/fs/file-operations", () => ({
  readFile: jest.fn(async () => "content"),
}));
jest.mock("../../src/common/fs/path-utils", () => ({
  getFileExtension: jest.fn(() => "ts"),
}));
jest.mock("../../src/common/utils/text-utils", () => ({
  countLines: jest.fn(() => 1),
}));
jest.mock("../../src/common/utils/logging", () => ({
  logError: jest.fn(),
  logSingleLineWarning: jest.fn(),
}));

const mockRepo = {
  getProjectFilesPaths: jest.fn(async () => []),
  insertSource: jest.fn(async () => undefined),
  deleteSourcesByProject: jest.fn(async () => undefined),
} as any;

// Add required LLMRouter methods used by CodebaseToDBLoader
const mockLLMRouter = {
  generateEmbeddings: jest.fn(async () => [0.01, 0.02, 0.03]),
} as any;
jest.mock("../../src/components/capture/file-summarizer", () => ({
  summarizeFile: jest.fn(async () => ({ summary: {}, summaryVector: [], summaryError: undefined })),
}));

describe("CodebaseToDBLoader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("captures codebase and stores sources", async () => {
    container.registerInstance(repositoryTokens.SourcesRepository, mockRepo);
    container.registerInstance(llmTokens.LLMRouter, mockLLMRouter);
    const loader = new CodebaseToDBLoader(mockRepo, mockLLMRouter);
    await loader.captureCodebaseToDatabase("proj", "/root", true);
    expect(mockRepo.insertSource).toHaveBeenCalled();
  });

  it("handles errors gracefully during concurrent processing", async () => {
    const errorRepo = {
      ...mockRepo,
      insertSource: jest.fn().mockRejectedValue(new Error("Database error")),
    };
    container.registerInstance(repositoryTokens.SourcesRepository, errorRepo);
    container.registerInstance(llmTokens.LLMRouter, mockLLMRouter);
    const loader = new CodebaseToDBLoader(errorRepo, mockLLMRouter);

    // Should not throw, errors should be caught and logged
    await expect(loader.captureCodebaseToDatabase("proj", "/root", true)).resolves.not.toThrow();
    expect(errorRepo.insertSource).toHaveBeenCalled();
  });
});
