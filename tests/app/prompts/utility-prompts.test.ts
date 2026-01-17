import { appPromptManager } from "../../../src/app/prompts/app-prompt-registry";

const codebaseQueryRenderablePrompt = appPromptManager.codebaseQuery;
import { CODEBASE_QUERY_TEMPLATE } from "../../../src/app/prompts/app-templates";
import { renderPrompt } from "../../../src/common/prompts/prompt-renderer";

describe("Utility Prompts", () => {
  describe("codebaseQueryRenderablePrompt", () => {
    it("should have correct structure", () => {
      expect(codebaseQueryRenderablePrompt.label).toBe("Codebase Query");
      expect(codebaseQueryRenderablePrompt.contentDesc).toContain("source code files");
      expect(codebaseQueryRenderablePrompt.template).toBe(CODEBASE_QUERY_TEMPLATE);
      expect(codebaseQueryRenderablePrompt.responseSchema).toBeDefined();
    });

    it("should have empty instructions array since template does not use instructionsText", () => {
      // The CODEBASE_QUERY_TEMPLATE doesn't use {{instructionsText}} placeholder,
      // so the instructions array should be empty to avoid redundancy
      expect(codebaseQueryRenderablePrompt.instructions).toEqual([]);
      expect(codebaseQueryRenderablePrompt.instructions).toHaveLength(0);
    });

    it("template should contain the complete instruction", () => {
      // The codebase query uses a custom template that contains all instructions
      // since it doesn't follow the standard ANALYSIS_PROMPT_TEMPLATE structure
      const template = codebaseQueryRenderablePrompt.template;
      expect(template).toContain("Act as a senior developer");
      expect(template).toContain("source code files");
      expect(template).toContain("QUESTION");
      expect(template).toContain("CODE");
      expect(template).toContain("specific evidence in the provided code");
    });

    it("should render correctly with renderPrompt function", () => {
      const testContent = "const x = 1;";
      const testQuestion = "What does this code do?";
      const rendered = renderPrompt(codebaseQueryRenderablePrompt, testContent, {
        question: testQuestion,
      });

      expect(rendered).toContain("Act as a senior developer");
      expect(rendered).toContain("QUESTION:");
      expect(rendered).toContain(testQuestion);
      expect(rendered).toContain("CODE:");
      expect(rendered).toContain(testContent);
      expect(rendered).not.toMatch(/\{\{[a-zA-Z]+\}\}/);
    });

    it("should use CODEBASE_QUERY_TEMPLATE", () => {
      expect(codebaseQueryRenderablePrompt.template).toBe(CODEBASE_QUERY_TEMPLATE);
    });
  });
});
