import "reflect-metadata";
import { PromptFileInsightsGenerator } from "../../../../src/app/components/insights/generators/prompt-file-insights-generator";
import LLMRouter from "../../../../src/common/llm/llm-router";
import type { FileProcessingRulesType } from "../../../../src/app/config/file-handling";
import type { LlmConcurrencyService } from "../../../../src/app/components/concurrency";

jest.mock("../../../../src/common/fs/directory-operations", () => ({
  ensureDirectoryExists: jest.fn().mockResolvedValue(undefined),
  listDirectoryEntries: jest.fn(async () => {
    // requirement00.prompt matches the typical numbered requirement prompt regex
    return [{ name: "requirement00.prompt" }, { name: "ignore.txt" }];
  }),
  findFilesRecursively: jest.fn(async () => []),
}));
jest.mock("../../../../src/common/fs/file-operations", () => ({
  readFile: jest.fn(async () => "Question?"),
  writeFile: jest.fn(async () => undefined),
}));
jest.mock("../../../../src/common/fs/path-utils", () => ({
  getFileExtension: jest.fn(() => "ts"),
}));
jest.mock("../../../../src/common/llm/llm-router");

describe("PromptFileInsightsGenerator", () => {
  const mockFileProcessingConfig = {
    FOLDER_IGNORE_LIST: ["node_modules", ".git"],
    FILENAME_PREFIX_IGNORE: "test-",
    FILENAME_IGNORE_LIST: ["package-lock.json"],
    BINARY_FILE_EXTENSION_IGNORE_LIST: ["png", "jpg"],
    CODE_FILE_EXTENSIONS: ["ts", "js", "java"],
    BOM_DEPENDENCY_CANONICAL_TYPES: ["maven", "npm"],
    SCHEDULED_JOB_CANONICAL_TYPES: ["shell-script"],
  } as unknown as FileProcessingRulesType;

  // Create mock for LlmConcurrencyService that executes immediately
  const mockLlmConcurrencyService = {
    run: jest.fn().mockImplementation(async <T>(fn: () => Promise<T>) => fn()),
    pendingCount: 0,
    activeCount: 0,
    clearQueue: jest.fn(),
  } as unknown as jest.Mocked<LlmConcurrencyService>;

  it("loads prompts filtering only .prompt files and generates insights", async () => {
    const mockExecuteCompletion = jest.fn().mockResolvedValue("LLM Response");
    const mockLlMRouter = {
      executeCompletion: mockExecuteCompletion,
    } as unknown as LLMRouter;
    const gen = new PromptFileInsightsGenerator(
      mockLlMRouter,
      mockFileProcessingConfig,
      mockLlmConcurrencyService,
    );
    const result = await gen.generateInsightsToFiles("/test/path", "test-llm");
    expect(result).toHaveLength(1);
    expect(mockExecuteCompletion).toHaveBeenCalledTimes(1);
  });
});
