import { appPromptManager } from "../../../src/app/prompts/app-prompt-registry";

const codebaseQueryPrompt = appPromptManager.codebaseQuery;
import { CODEBASE_QUERY_TEMPLATE } from "../../../src/app/prompts/app-templates";

describe("Utility Prompts", () => {
  describe("codebaseQueryPrompt", () => {
    it("should have correct structure", () => {
      expect(codebaseQueryPrompt.contentDesc).toContain("source code files");
      expect(codebaseQueryPrompt.template).toBe(CODEBASE_QUERY_TEMPLATE);
      // TEXT mode prompt = no responseSchema
      expect(codebaseQueryPrompt.responseSchema).toBeUndefined();
    });

    it("should have empty instructions array since template does not use instructionsText", () => {
      // The CODEBASE_QUERY_TEMPLATE doesn't use {{instructionsText}} placeholder,
      // so the instructions array should be empty to avoid redundancy
      expect(codebaseQueryPrompt.instructions).toEqual([]);
      expect(codebaseQueryPrompt.instructions).toHaveLength(0);
    });

    it("template should contain the complete instruction", () => {
      // The codebase query uses a custom template that contains all instructions
      // since it doesn't follow the standard ANALYSIS_PROMPT_TEMPLATE structure
      const template = codebaseQueryPrompt.template;
      expect(template).toContain("Act as a senior developer");
      expect(template).toContain("source code files");
      expect(template).toContain("QUESTION");
      expect(template).toContain("CODE");
      expect(template).toContain("specific evidence in the provided code");
    });

    it("should render correctly with renderPrompt method", () => {
      const testContent = "const x = 1;";
      const testQuestion = "What does this code do?";
      const rendered = codebaseQueryPrompt.renderPrompt(testContent, {
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
      expect(codebaseQueryPrompt.template).toBe(CODEBASE_QUERY_TEMPLATE);
    });
  });
});
