import "reflect-metadata";
import { RawAnalyzerDrivenByReqsFiles } from "../../../../src/app/components/insights/file-driven/raw-analyzer-driven-by-reqs-files";
import LLMRouter from "../../../../src/common/llm/llm-router";

jest.mock("../../../../src/common/fs/directory-operations", () => ({
  ensureDirectoryExists: jest.fn().mockResolvedValue(undefined),
  listDirectoryEntries: jest.fn(async () => {
    // requirement00.prompt matches the typical numbered requirement prompt regex
    return [{ name: "requirement00.prompt" }, { name: "ignore.txt" }];
  }),
}));
jest.mock("../../../../src/common/fs/file-operations", () => ({
  readFile: jest.fn(async () => "Question?"),
  writeFile: jest.fn(async () => undefined),
}));
jest.mock("../../../../src/common/utils/directory-to-markdown", () => ({
  formatDirectoryAsMarkdown: jest.fn(async () => "CODEBLOCK"),
  adaptFileProcessingConfig: jest.fn(
    (config: {
      FOLDER_IGNORE_LIST: readonly string[];
      FILENAME_PREFIX_IGNORE: string;
      BINARY_FILE_EXTENSION_IGNORE_LIST: readonly string[];
    }) => ({
      folderIgnoreList: config.FOLDER_IGNORE_LIST,
      filenameIgnorePrefix: config.FILENAME_PREFIX_IGNORE,
      binaryFileExtensionIgnoreList: config.BINARY_FILE_EXTENSION_IGNORE_LIST,
    }),
  ),
}));
jest.mock("../../../../src/common/llm/llm-router");

describe("PromptFileInsightsGenerator", () => {
  it("loads prompts filtering only .prompt files and generates insights", async () => {
    const mockExecuteCompletion = jest.fn().mockResolvedValue("LLM Response");
    const mockLlMRouter = {
      executeCompletion: mockExecuteCompletion,
    } as unknown as LLMRouter;
    const gen = new RawAnalyzerDrivenByReqsFiles(mockLlMRouter);
    const result = await gen.generateInsightsToFiles("/test/path", "test-llm");
    expect(result).toHaveLength(1);
    expect(mockExecuteCompletion).toHaveBeenCalledTimes(1);
  });
});
