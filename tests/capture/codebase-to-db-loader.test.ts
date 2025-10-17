import "reflect-metadata";
import CodebaseToDBLoader from "../../src/components/capture/codebase-to-db-loader";
import { TOKENS } from "../../src/tokens";
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
jest.mock("../../src/common/utils/async-utils", () => ({
  processItemsConcurrently: jest.fn(async (items: string[], fn: any) => {
    for (const item of items) await fn(item);
  }),
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
const mockFileSummarizer = {
  summarizeFile: jest.fn(async () => ({ summary: {}, summaryVector: [], summaryError: undefined })),
} as any;

describe("CodebaseToDBLoader", () => {
  it("captures codebase and stores sources", async () => {
    container.registerInstance(TOKENS.SourcesRepository, mockRepo);
    container.registerInstance(TOKENS.LLMRouter, mockLLMRouter);
    container.registerInstance(TOKENS.FileSummarizer, mockFileSummarizer);
    const loader = new CodebaseToDBLoader(mockRepo, mockLLMRouter, mockFileSummarizer);
    await loader.captureCodebaseToDatabase("proj", "/root", true);
    expect(mockRepo.insertSource).toHaveBeenCalled();
  });
});
