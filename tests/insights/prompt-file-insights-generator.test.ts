import "reflect-metadata";
import { RawAnalyzerDrivenByReqsFiles } from "../../src/components/raw-analysis/raw-analyzer-driven-by-reqs-files";
import LLMRouter from "../../src/llm/llm-router";

jest.mock("../../src/common/fs/directory-operations", () => ({
  ensureDirectoryExists: jest.fn().mockResolvedValue(undefined),
  listDirectoryEntries: jest.fn(async () => {
    // requirement00.prompt matches the typical numbered requirement prompt regex
    return [{ name: "requirement00.prompt" }, { name: "ignore.txt" }];
  }),
}));
jest.mock("../../src/common/fs/file-operations", () => ({
  readFile: jest.fn(async () => "Question?"),
  writeFile: jest.fn(async () => undefined),
}));
jest.mock("../../src/common/utils/codebase-formatter", () => ({
  formatCodeBlockMarkdownFromFolderCodebase: jest.fn(async () => "CODEBLOCK"),
}));
jest.mock("../../src/llm/llm-router");

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
