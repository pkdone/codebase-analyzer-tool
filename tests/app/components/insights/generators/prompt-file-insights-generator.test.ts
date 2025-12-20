import "reflect-metadata";
import { PromptFileInsightsGenerator } from "../../../../../src/app/components/insights/generators/prompt-file-insights-generator";
import LLMRouter from "../../../../../src/common/llm/llm-router";

jest.mock("../../../../../src/common/fs/directory-operations", () => ({
  ensureDirectoryExists: jest.fn().mockResolvedValue(undefined),
  listDirectoryEntries: jest.fn(async () => {
    // requirement00.prompt matches the typical numbered requirement prompt regex
    return [{ name: "requirement00.prompt" }, { name: "ignore.txt" }];
  }),
}));
jest.mock("../../../../../src/common/fs/file-operations", () => ({
  readFile: jest.fn(async () => "Question?"),
  writeFile: jest.fn(async () => undefined),
}));
jest.mock("../../../../../src/common/utils/directory-to-markdown", () => ({
  formatDirectoryAsMarkdown: jest.fn(async () => "CODEBLOCK"),
}));
jest.mock("../../../../../src/common/llm/llm-router");

describe("PromptFileInsightsGenerator", () => {
  it("loads prompts filtering only .prompt files and generates insights", async () => {
    const mockExecuteCompletion = jest.fn().mockResolvedValue("LLM Response");
    const mockLlMRouter = {
      executeCompletion: mockExecuteCompletion,
    } as unknown as LLMRouter;
    const gen = new PromptFileInsightsGenerator(mockLlMRouter);
    const result = await gen.generateInsightsToFiles("/test/path", "test-llm");
    expect(result).toHaveLength(1);
    expect(mockExecuteCompletion).toHaveBeenCalledTimes(1);
  });
});
