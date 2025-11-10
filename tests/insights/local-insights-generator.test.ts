import "reflect-metadata";
import { LocalInsightsGenerator } from "../../src/components/insights/local-insights-generator";
import LLMRouter from "../../src/llm/core/llm-router";

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
jest.mock("../../src/components/insights/utils/codebase-formatter", () => ({
  formatCodebaseForPrompt: jest.fn(async () => "CODEBLOCK"),
}));
jest.mock("../../src/llm/core/llm-router");

describe("LocalInsightsGenerator", () => {
  it("loads prompts filtering only .prompt files", async () => {
    const mockLlMRouter = {} as unknown as LLMRouter;
    const gen = new LocalInsightsGenerator(mockLlMRouter);
    const prompts = await gen.loadPrompts();
    expect(prompts).toHaveLength(1);
    expect(prompts[0].filename).toBe("requirement00");
  });
});
